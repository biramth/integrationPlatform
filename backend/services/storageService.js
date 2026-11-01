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

const SUPABASE_BUCKET = (process.env.SUPABASE_BUCKET_NAME || 'luggage-photos').trim();
const R2_BUCKET = (process.env.R2_BUCKET_NAME || 'luggage-photos').trim();
// Rétrocompatibilité
const BUCKET = R2_BUCKET;

// Détection automatique du stockage :
// 1. Cloudflare R2 (si les clés R2 sont présentes) — stockage illimité, sans frais d'egress
// 2. Supabase Storage (si les clés Supabase sont présentes) — actif en parallèle pour la migration
// 3. Repli en mémoire (développement local sans cloud)
const r2AccountIdRaw = process.env.R2_ACCOUNT_ID?.trim() || '';
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || '';
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || '';

// Nettoyer l'Account ID au cas où l'utilisateur a collé l'URL complète du endpoint R2
const r2AccountId = r2AccountIdRaw
  .replace(/^https?:\/\//i, '')
  .replace(/\.r2\.cloudflarestorage\.com.*$/i, '')
  .trim();

const isR2 = Boolean(r2AccountId && r2AccessKeyId && r2SecretAccessKey);

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
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });
  console.log(`[Storage] Cloudflare R2 actif (bucket: "${R2_BUCKET}", endpoint: https://${r2AccountId}.r2.cloudflarestorage.com)`);
}

if (isSupabase) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log(`[Storage] Supabase Storage initialisé (bucket: "${SUPABASE_BUCKET}")`);
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
      Bucket: R2_BUCKET,
      Key: objectPath,
      Body: file.buffer,
      ContentType: file.mimetype || 'image/jpeg',
    });
    try {
      await r2Client.send(command);
      return objectPath;
    } catch (err) {
      throw new Error(`Échec de l'upload vers Cloudflare R2 (${R2_BUCKET}) : ${err.message}`);
    }
  }

  if (isSupabase) {
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(objectPath, file.buffer, {
      contentType: file.mimetype || 'image/jpeg',
      upsert: false,
    });
    if (error) {
      throw new Error(`Échec de l'upload vers Supabase Storage (${SUPABASE_BUCKET}) : ${error.message}`);
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
  const cleanPath = String(objectPath).replace(/^\/+/, '');

  if (isR2) {
    try {
      await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: cleanPath }));
    } catch (err) {
      console.warn(`[R2] Avertissement suppression ${cleanPath} : ${err.message}`);
    }
  }

  if (isSupabase) {
    try {
      await supabase.storage.from(SUPABASE_BUCKET).remove([cleanPath]);
    } catch (err) {
      console.warn(`[Supabase] Avertissement suppression ${cleanPath} : ${err.message}`);
    }
  }

  inMemoryFiles.delete(cleanPath);
}

async function listAllFiles() {
  if (isR2) {
    const files = [];
    let continuationToken = undefined;
    do {
      const command = new ListObjectsV2Command({
        Bucket: R2_BUCKET,
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
        .from(SUPABASE_BUCKET)
        .list('', { limit, offset, sortBy: { column: 'name', order: 'asc' } });

      if (error) {
        throw new Error(`Échec du listage Supabase Storage (${SUPABASE_BUCKET}) : ${error.message}`);
      }

      if (!data || data.length === 0) break;

      for (const folder of data) {
        const { data: subFiles, error: subErr } = await supabase.storage
          .from(SUPABASE_BUCKET)
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
  const cleanPaths = objectPaths.map((p) => String(p).replace(/^\/+/, ''));

  if (isR2) {
    const chunks = [];
    for (let i = 0; i < cleanPaths.length; i += 1000) {
      chunks.push(cleanPaths.slice(i, i + 1000));
    }
    for (const chunk of chunks) {
      const command = new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      });
      await r2Client.send(command);
    }
  }

  if (isSupabase) {
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove(cleanPaths);
    if (error) {
      console.warn(`[Supabase] Avertissement suppression groupée : ${error.message}`);
    }
  }

  for (const p of cleanPaths) inMemoryFiles.delete(p);
}

async function cleanupOrphanedFiles() {
  const db = require('../db/database');

  const dbFiles = await db.all(
    "SELECT file_path FROM luggage_items WHERE file_path IS NOT NULL"
  );
  const dbPaths = new Set(dbFiles.map((r) => String(r.file_path).replace(/^\/+/, '')));

  const storageFiles = await listAllFiles();
  const orphaned = storageFiles.filter((f) => !dbPaths.has(f));

  if (orphaned.length === 0) return { deleted: 0 };

  await deleteMany(orphaned);
  return { deleted: orphaned.length };
}

async function getSignedUrl(objectPath, expiresInSeconds = 300) {
  const cleanPath = String(objectPath).replace(/^\/+/, '');

  // 1. Si Cloudflare R2 est configuré : tenter R2 en priorité
  if (isR2) {
    if (process.env.R2_PUBLIC_URL) {
      const base = process.env.R2_PUBLIC_URL.replace(/\/$/, '');
      return `${base}/${cleanPath}`;
    }

    // Si Supabase est aussi configuré, on vérifie si l'image est déjà sur R2.
    // Si pas encore transférée, on bascule de manière transparente sur Supabase pour ne pas casser l'image.
    let presentInR2 = true;
    if (isSupabase) {
      try {
        await r2Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: cleanPath }));
      } catch {
        presentInR2 = false;
      }
    }

    if (presentInR2) {
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: cleanPath,
      });
      return await getS3SignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
    }
  }

  // 2. Si pas sur R2 ou non présent sur R2, tenter Supabase Storage
  if (isSupabase) {
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).createSignedUrl(cleanPath, expiresInSeconds);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  // 3. Repli en mémoire ou placeholder
  const file = inMemoryFiles.get(cleanPath);
  if (file && file.buffer) {
    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif">Photo bagage</text></svg>`;
}

/**
 * Diffuse directement le flux binaire de l'image au client HTTP.
 * Évite les redirections 302 vers R2 (qui échouent côté navigateur en raison des restrictions CORS
 * et des conflits d'en-tête Authorization d'Axios).
 */
async function streamLuggagePhoto(objectPath, res) {
  const cleanPath = String(objectPath).replace(/^\/+/, '');

  // 1. Tenter Cloudflare R2 si configuré
  if (isR2 && r2Client) {
    try {
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: cleanPath,
      });
      const response = await r2Client.send(command);

      if (response && response.Body) {
        const contentType = response.ContentType || (cleanPath.endsWith('.png') ? 'image/png' : 'image/jpeg');
        res.setHeader('Content-Type', contentType);
        if (response.ContentLength) {
          res.setHeader('Content-Length', response.ContentLength);
        }
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

        if (typeof response.Body.pipe === 'function') {
          return response.Body.pipe(res);
        }
        if (typeof response.Body.transformToByteArray === 'function') {
          const bytes = await response.Body.transformToByteArray();
          return res.send(Buffer.from(bytes));
        }
      }
    } catch (r2Err) {
      console.warn(`[Storage] Photo non trouvée sur R2 (${cleanPath}), repli vers Supabase :`, r2Err.message);
    }
  }

  // 2. Repli vers Supabase Storage si configuré
  if (isSupabase && supabase) {
    try {
      const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(cleanPath);
      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer());
        const contentType = data.type || (cleanPath.endsWith('.png') ? 'image/png' : 'image/jpeg');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        return res.send(buffer);
      }
    } catch (supaErr) {
      console.warn(`[Storage] Repli Supabase échoué (${cleanPath}) :`, supaErr.message);
    }
  }

  // 3. Repli en mémoire (développement local)
  const file = inMemoryFiles.get(cleanPath);
  if (file && file.buffer) {
    res.setHeader('Content-Type', file.mimetype || 'image/jpeg');
    res.setHeader('Content-Length', file.buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(file.buffer);
  }

  // 4. Si introuvable nulle part
  return res.status(404).json({ error: 'Photo de bagage introuvable.' });
}

async function getStorageStatus() {
  const db = require('../db/database');
  const countRow = await db.get('SELECT COUNT(*) AS total FROM luggage_items WHERE file_path IS NOT NULL');
  return {
    isR2Configured: isR2,
    isSupabaseConfigured: Boolean(supabase),
    activeProvider: isR2 ? 'Cloudflare R2' : isSupabase ? 'Supabase Storage' : 'Mémoire (local)',
    r2Bucket: R2_BUCKET,
    supabaseBucket: SUPABASE_BUCKET,
    bucketName: R2_BUCKET,
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

  // Test de diagnostic préalable de connectivité R2 (vérification des permissions d'écriture/lecture sur le bucket R2)
  try {
    await r2Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: '___r2_ping_check___' })).catch((err) => {
      const status = err?.$metadata?.httpStatusCode || err?.status;
      const code = err?.name || err?.Code || err?.code;
      if (status === 403 || status === 401 || code === 'AccessDenied' || code === 'InvalidAccessKeyId') {
        throw new Error(
          `Accès R2 refusé (HTTP ${status || code}) : vérifiez que le token R2 a les permissions d'administration/lecture-écriture sur le bucket "${R2_BUCKET}".`
        );
      }
    });
  } catch (testErr) {
    if (testErr.message.includes('Accès R2 refusé')) {
      throw testErr;
    }
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
    const rawPath = item.file_path;
    const objectPath = String(rawPath).replace(/^\/+/, '');

    try {
      // 1. Vérifier si l'objet existe déjà dans Cloudflare R2
      let existsInR2 = false;
      try {
        await r2Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: objectPath }));
        existsInR2 = true;
      } catch (headErr) {
        const status = headErr?.$metadata?.httpStatusCode || headErr?.status;
        const code = headErr?.name || headErr?.Code || headErr?.code;
        if (status === 403 || status === 401 || code === 'AccessDenied' || code === 'InvalidAccessKeyId') {
          throw new Error(`Accès refusé au bucket R2 "${R2_BUCKET}" (${code || status}).`);
        }
        // Sinon (404/NotFound/NoSuchKey), l'objet n'existe pas encore sur R2 : continuer
      }

      if (existsInR2) {
        stats.alreadyInR2 += 1;
        if (deleteSource) {
          try {
            await supabase.storage.from(SUPABASE_BUCKET).remove([objectPath]);
            stats.deletedFromSource += 1;
          } catch (delErr) {
            console.warn(`[Supabase remove error ${objectPath}]:`, delErr.message);
          }
        }
        if (typeof onProgress === 'function') onProgress(stats);
        continue;
      }

      // 2. Télécharger le fichier depuis Supabase Storage (en ciblant SUPABASE_BUCKET)
      let downloadRes = await supabase.storage.from(SUPABASE_BUCKET).download(objectPath);
      if (downloadRes.error && rawPath !== objectPath) {
        // Tentative alternative avec le chemin brut
        downloadRes = await supabase.storage.from(SUPABASE_BUCKET).download(rawPath);
      }

      const { data, error } = downloadRes;
      if (error || !data) {
        const errorDetail = error?.message || 'Objet introuvable dans Supabase Storage';
        console.error(`[Storage Migration] Échec Supabase pour "${objectPath}" dans bucket "${SUPABASE_BUCKET}": ${errorDetail}`);
        stats.failed += 1;
        stats.errors.push({
          id: item.id,
          path: objectPath,
          error: `Supabase [${SUPABASE_BUCKET}] : ${errorDetail}`,
        });
        if (typeof onProgress === 'function') onProgress(stats);
        continue;
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      const contentType = data.type || (objectPath.endsWith('.png') ? 'image/png' : 'image/jpeg');

      // 3. Envoyer vers Cloudflare R2
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: objectPath,
          Body: buffer,
          ContentType: contentType,
        })
      );
      stats.migrated += 1;

      // 4. Si demandé, supprimer de Supabase pour libérer le quota
      if (deleteSource) {
        try {
          await supabase.storage.from(SUPABASE_BUCKET).remove([objectPath]);
          stats.deletedFromSource += 1;
        } catch (delErr) {
          console.warn(`[Supabase delete error ${objectPath}]:`, delErr.message);
        }
      }

      if (typeof onProgress === 'function') onProgress(stats);
    } catch (err) {
      console.error(`[Storage Migration] Erreur pour item ${item.id} (${objectPath}):`, err.message);
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
  streamLuggagePhoto,
  listAllFiles,
  deleteMany,
  cleanupOrphanedFiles,
  migrateSupabaseToR2,
  getStorageStatus,
  BUCKET,
  SUPABASE_BUCKET,
  R2_BUCKET,
  isR2,
  isSupabase,
};
