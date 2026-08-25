const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const BUCKET = 'luggage-photos';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function extensionFor(file) {
  const fromName = (file.originalname.match(/\.[a-zA-Z0-9]+$/) || [])[0];
  return fromName || '.jpg';
}

async function uploadLuggagePhoto(dut1Id, file) {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensionFor(file)}`;
  const objectPath = `${dut1Id}/${unique}`;

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
  const { error } = await supabase.storage.from(BUCKET).remove([objectPath]);
  if (error) {
    throw new Error(`Échec de la suppression sur Supabase Storage : ${error.message}`);
  }
}

async function listAllFiles() {
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
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(objectPath, expiresInSeconds);
  if (error) {
    throw new Error(`Échec de la génération de l'URL signée : ${error.message}`);
  }
  return data.signedUrl;
}

module.exports = { uploadLuggagePhoto, deleteLuggagePhoto, getSignedUrl, listAllFiles, deleteMany, cleanupOrphanedFiles, BUCKET };
