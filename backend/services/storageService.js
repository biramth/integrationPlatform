const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const BUCKET = 'luggage-photos';

const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!hasSupabase) {
  console.warn('[AI Studio] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant — stockage en mémoire actif.');
}

const supabase = hasSupabase
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const inMemoryFiles = new Map();

function extensionFor(file) {
  const fromName = (file.originalname.match(/\.[a-zA-Z0-9]+$/) || [])[0];
  return fromName || '.jpg';
}

async function uploadLuggagePhoto(dut1Id, file) {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensionFor(file)}`;
  const objectPath = `${dut1Id}/${unique}`;

  if (!hasSupabase) {
    inMemoryFiles.set(objectPath, {
      buffer: file.buffer,
      mimetype: file.mimetype || 'image/jpeg',
      name: file.originalname,
    });
    return objectPath;
  }

  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });

  if (error) {
    throw new Error(`Échec de l'upload vers Supabase Storage : ${error.message}`);
  }

  return objectPath;
}

async function deleteLuggagePhoto(objectPath) {
  if (!hasSupabase) {
    inMemoryFiles.delete(objectPath);
    return;
  }
  const { error } = await supabase.storage.from(BUCKET).remove([objectPath]);
  if (error) {
    throw new Error(`Échec de la suppression sur Supabase Storage : ${error.message}`);
  }
}

async function listAllFiles() {
  if (!hasSupabase) {
    return Array.from(inMemoryFiles.keys());
  }

  const files = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      throw new Error(`Échec du listage Supabase Storage : ${error.message}`);
    }

    if (!data || data.length === 0) break;

    for (const folder of data) {
      const { data: subFiles, error: subErr } = await supabase.storage
        .from(BUCKET)
        .list(folder.name, { limit: 100 });

      if (subErr) continue;

      for (const f of subFiles || []) {
        files.push(`${folder.name}/${f.name}`);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return files;
}

async function deleteMany(objectPaths) {
  if (objectPaths.length === 0) return;
  if (!hasSupabase) {
    for (const p of objectPaths) inMemoryFiles.delete(p);
    return;
  }
  const { error } = await supabase.storage.from(BUCKET).remove(objectPaths);
  if (error) {
    throw new Error(`Échec de la suppression groupée sur Supabase Storage : ${error.message}`);
  }
}

async function cleanupOrphanedFiles() {
  const db = require('../db/database');

  const dbFiles = await db.all(
    "SELECT file_path FROM luggage_items WHERE file_path IS NOT NULL"
  );
  const dbPaths = new Set(dbFiles.map((r) => r.file_path));

  const storageFiles = await listAllFiles();

  const orphaned = storageFiles.filter((f) => !dbPaths.has(f));

  if (orphaned.length === 0) return { deleted: 0 };

  await deleteMany(orphaned);
  return { deleted: orphaned.length };
}

async function getSignedUrl(objectPath, expiresInSeconds = 300) {
  if (!hasSupabase) {
    const file = inMemoryFiles.get(objectPath);
    if (file && file.buffer) {
      return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif">Photo bagage</text></svg>`;
  }
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(objectPath, expiresInSeconds);
  if (error) {
    throw new Error(`Échec de la génération de l'URL signée : ${error.message}`);
  }
  return data.signedUrl;
}

module.exports = { uploadLuggagePhoto, deleteLuggagePhoto, getSignedUrl, listAllFiles, deleteMany, cleanupOrphanedFiles, BUCKET };
