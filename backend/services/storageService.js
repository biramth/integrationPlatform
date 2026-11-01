const { createClient } = require('@supabase/supabase-js');
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl: getS3SignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const BUCKET = process.env.R2_BUCKET_NAME || 'luggage-photos';

// Détection automatique du stockage :
// 1. Cloudflare R2 (si les clés R2 sont présentes) — stockage illimité, sans frais d'egress
// 2. Supabase Storage (si les clés Supabase sont présentes) — actif en parallèle pour la migration
// 3. Repli en mémoire (développement local sans cloud)
const isR2 = Boolean(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY
);

const isSupabase = Boolean(
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let r2Client = null;
let supabase = null;
const inMemoryFiles = new Map();

if (isR2) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  console.log(`[Storage] Cloudflare R2 actif (bucket: "${BUCKET}", endpoint: https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com)`);
}

if (isSupabase) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log(`[Storage] Supabase Storage initialisé (bucket: "${BUCKET}")`);
}

if (!isR2 && !isSupabase) {
  console.warn('[Storage] Aucun stockage cloud configuré (R2 ou Supabase) — stockage en mémoire actif.');
}

function extensionFor(file) {
  const fromName = (file.originalname.match(/\.[a-zA-Z0-9]+$/) || [])[0];
  return fromName || '.jpg';
}

async function uploadLuggagePhoto(dut1Id, file) {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensionFor(file)}`;
  const objectPath = `${dut1Id}/${unique}`;

  if (isR2) {
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: objectPath,
      Body: file.buffer,
      ContentType: file.mimetype || 'image/jpeg',
    });
    try {
      await r2Client.send(command);
      return objectPath;
    } catch (err) {
      throw new Error(`Échec de l'upload vers Cloudflare R2 : ${err.message}`);
    }
  }

  if (isSupabase) {
    const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file.buffer, {
      contentType: file.mimetype || 'image/jpeg',
      upsert: false,
    });
    if (error) {
      throw new Error(`Échec de l'upload vers Supabase Storage : ${error.message}`);
    }
    return objectPath;
  }

  inMemoryFiles.set(objectPath, {
    buffer: file.buffer,
    mimetype: file.mimetype || 'image/jpeg',
    name: file.originalname,
  });
  return objectPath;
}

async function deleteLuggagePhoto(objectPath) {
  if (isR2) {
    try {
      await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: objectPath }));
    } catch (err) {
      throw new Error(`Échec de la suppression sur Cloudflare R2 : ${err.message}`);
    }
    return;
  }

  if (isSupabase) {
    const { error } = await supabase.storage.from(BUCKET).remove([objectPath]);
    if (error) {
      throw new Error(`Échec de la suppression sur Supabase Storage : ${error.message}`);
    }
    return;
  }

  inMemoryFiles.delete(objectPath);
}

async function listAllFiles() {
  if (isR2) {
    const files = [];
    let continuationToken = undefined;
    do {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });
      const response = await r2Client.send(command);
      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key) files.push(obj.Key);
        }
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
    return files;
  }

  if (isSupabase) {
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

  return Array.from(inMemoryFiles.keys());
}

async function deleteMany(objectPaths) {
  if (!objectPaths || objectPaths.length === 0) return;

  if (isR2) {
    const chunks = [];
    for (let i = 0; i < objectPaths.length; i += 1000) {
      chunks.push(objectPaths.slice(i, i + 1000));
    }
    for (const chunk of chunks) {
      const command = new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      });
      await r2Client.send(command);
    }
    return;
  }

  if (isSupabase) {
    const { error } = await supabase.storage.from(BUCKET).remove(objectPaths);
    if (error) {
      throw new Error(`Échec de la suppression groupée sur Supabase Storage : ${error.message}`);
    }
    return;
  }

  for (const p of objectPaths) inMemoryFiles.delete(p);
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
  if (isR2) {
    // Si un domaine public personnalisé ou r2.dev est configuré : URL CDN directe sans présignature
    if (process.env.R2_PUBLIC_URL) {
      const base = process.env.R2_PUBLIC_URL.replace(/\/$/, '');
      return `${base}/${objectPath}`;
    }
    // Sinon génération d'une URL signée S3
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: objectPath,
    });
    return await getS3SignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
  }

  if (isSupabase) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(objectPath, expiresInSeconds);
    if (error) {
      throw new Error(`Échec de la génération de l'URL signée : ${error.message}`);
    }
    return data.signedUrl;
  }

  const file = inMemoryFiles.get(objectPath);
  if (file && file.buffer) {
    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif">Photo bagage</text></svg>`;
}

async function getStorageStatus() {
  const db = require('../db/database');
  const countRow = await db.get('SELECT COUNT(*) AS total FROM luggage_items WHERE file_path IS NOT NULL');
  return {
    isR2Configured: isR2,
    isSupabaseConfigured: Boolean(supabase),
    activeProvider: isR2 ? 'Cloudflare R2' : isSupabase ? 'Supabase Storage' : 'Mémoire (local)',
    bucketName: BUCKET,
    totalPhotosInDb: parseInt(countRow?.total || 0, 10),
    r2PublicUrlConfigured: Boolean(process.env.R2_PUBLIC_URL),
    r2PublicUrl: process.env.R2_PUBLIC_URL || null,
  };
}

async function migrateSupabaseToR2({ deleteSource = false, onProgress = null } = {}) {
  if (!isR2 || !r2Client) {
    throw new Error("Cloudflare R2 n'est pas configuré. Veuillez renseigner R2_ACCOUNT_ID, R2_ACCESS_KEY_ID et R2_SECRET_ACCESS_KEY.");
  }
  if (!supabase) {
    throw new Error("Supabase Storage n'est pas configuré. Veuillez renseigner SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");
  }

  const db = require('../db/database');
  const items = await db.all(
    'SELECT id, dut1_id, file_path, original_name FROM luggage_items WHERE file_path IS NOT NULL'
  );

  const stats = {
    total: items.length,
    migrated: 0,
    alreadyInR2: 0,
    failed: 0,
    deletedFromSource: 0,
    errors: [],
  };

  for (const item of items) {
    const objectPath = item.file_path;
    try {
      // 1. Vérifier si l'objet existe déjà dans Cloudflare R2
      let existsInR2 = false;
      try {
        await r2Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: objectPath }));
        existsInR2 = true;
      } catch {
        // Non trouvé dans R2 (404/NotFound) : continue vers le transfert
      }

      if (existsInR2) {
        stats.alreadyInR2 += 1;
        if (deleteSource) {
          try {
            await supabase.storage.from(BUCKET).remove([objectPath]);
            stats.deletedFromSource += 1;
          } catch {
            // Tolérance si la suppression source échoue
          }
        }
        if (typeof onProgress === 'function') onProgress(stats);
        continue;
      }

      // 2. Télécharger le fichier depuis Supabase Storage
      const { data, error } = await supabase.storage.from(BUCKET).download(objectPath);
      if (error || !data) {
        stats.failed += 1;
        stats.errors.push({ id: item.id, path: objectPath, error: error?.message || 'Fichier introuvable sur Supabase' });
        if (typeof onProgress === 'function') onProgress(stats);
        continue;
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      const contentType = data.type || (objectPath.endsWith('.png') ? 'image/png' : 'image/jpeg');

      // 3. Envoyer vers Cloudflare R2
      await r2Client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: objectPath,
          Body: buffer,
          ContentType: contentType,
        })
      );
      stats.migrated += 1;

      // 4. Si demandé, supprimer de Supabase pour libérer le quota
      if (deleteSource) {
        try {
          await supabase.storage.from(BUCKET).remove([objectPath]);
          stats.deletedFromSource += 1;
        } catch {
          // Tolérance
        }
      }

      if (typeof onProgress === 'function') onProgress(stats);
    } catch (err) {
      stats.failed += 1;
      stats.errors.push({ id: item.id, path: objectPath, error: err.message });
      if (typeof onProgress === 'function') onProgress(stats);
    }
  }

  return stats;
}

module.exports = {
  uploadLuggagePhoto,
  deleteLuggagePhoto,
  getSignedUrl,
  listAllFiles,
  deleteMany,
  cleanupOrphanedFiles,
  migrateSupabaseToR2,
  getStorageStatus,
  BUCKET,
  isR2,
  isSupabase,
};
