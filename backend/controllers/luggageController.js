const sharp = require('sharp');
const db = require('../db/database');
const storage = require('../services/storageService');
const auditService = require('../services/auditService');

// Optimisation charge / mémoire : limiter la concurrence Sharp pour éviter
// l'explosion de RAM (512MB sur Render) lors d'arrivées massives de bagages.
try {
  sharp.concurrency(1);
  sharp.cache({ files: 0, memory: 32 });
} catch {
  // Ignorer si l'environnement ne supporte pas la config libvips
}

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 80;

async function compressImage(file) {
  // Si c'est déjà un JPEG petit (< 500 KB) et peu dimensionné, on ne touche à rien.
  const isSmallJpeg = file.mimetype === 'image/jpeg' && file.buffer.length < 500 * 1024;
  if (isSmallJpeg) return file;

  const metadata = await sharp(file.buffer).metadata();
  const needsResize = (metadata.width || 0) > MAX_DIMENSION || (metadata.height || 0) > MAX_DIMENSION;

  let pipeline = sharp(file.buffer);
  if (needsResize) {
    pipeline = pipeline.resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true });
  }
  const compressed = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();

  // On garde le buffer original si la compression n'a rien gagné.
  if (compressed.length >= file.buffer.length) return file;

  return {
    ...file,
    buffer: compressed,
    mimetype: 'image/jpeg',
    originalname: file.originalname.replace(/\.[^.]+$/, '.jpg'),
  };
}

async function createLuggageItem(req, res) {
  const { id } = req.params;
  const record = await db.get('SELECT id, first_name, last_name FROM dut1_records WHERE id = $1', [id]);

  if (!record) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Fichier photo requis (champ "photo").' });
  }

  const isSensitive = req.body.isSensitive === 'true' || req.body.isSensitive === '1';
  const photo = await compressImage(req.file);
  const objectPath = await storage.uploadLuggagePhoto(id, photo);

  const result = await db.run(
    `INSERT INTO luggage_items (dut1_id, file_path, original_name, is_sensitive, sensitive_note, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [id, objectPath, req.file.originalname, isSensitive, req.body.sensitiveNote || null, req.user.id]
  );

  const item = await db.get('SELECT * FROM luggage_items WHERE id = $1', [result.rows[0].id]);

  await auditService.logAction(req, {
    action: 'luggage_item.create',
    resourceType: 'luggage_item',
    resourceId: item.id,
    resourceLabel: `${record.first_name} ${record.last_name}`,
    commission: 'orga',
    after: item,
  });

  res.status(201).json({ item });
}

async function listLuggageItems(req, res) {
  const items = await db.all(
    'SELECT id, file_path, original_name, is_sensitive, sensitive_note, uploaded_at FROM luggage_items WHERE dut1_id = $1',
    [req.params.id]
  );
  res.json({ items });
}

async function deleteLuggageItem(req, res) {
  const item = await db.get('SELECT * FROM luggage_items WHERE id = $1', [req.params.itemId]);
  if (!item) {
    return res.status(404).json({ error: 'Bagage introuvable.' });
  }

  await storage.deleteLuggagePhoto(item.file_path);
  await db.run('DELETE FROM luggage_items WHERE id = $1', [req.params.itemId]);

  await auditService.logAction(req, {
    action: 'luggage_item.delete',
    resourceType: 'luggage_item',
    resourceId: req.params.itemId,
    commission: 'orga',
    before: item,
  });

  res.status(204).send();
}

async function setLuggageCount(req, res) {
  const { id } = req.params;
  const { luggageCount } = req.body;

  const count = luggageCount === null || luggageCount === undefined || luggageCount === '' ? null : Number(luggageCount);
  if (count !== null && (!Number.isInteger(count) || count < 0)) {
    return res.status(400).json({ error: 'luggageCount doit être un entier positif ou nul.' });
  }

  const before = await db.get('SELECT id, first_name, last_name, luggage_count FROM dut1_records WHERE id = $1', [id]);
  if (!before) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  await db.run(
    `UPDATE dut1_records SET luggage_count = $1, updated_at = NOW() WHERE id = $2`,
    [count, id]
  );

  const record = await db.get('SELECT id, luggage_count FROM dut1_records WHERE id = $1', [id]);

  await auditService.logAction(req, {
    action: 'dut1.set_luggage_count',
    resourceType: 'dut1_record',
    resourceId: id,
    resourceLabel: `${before.first_name} ${before.last_name}`,
    commission: 'orga',
    before: { luggage_count: before.luggage_count },
    after: { luggage_count: record.luggage_count },
  });

  res.json({ record });
}

async function listMyLuggageItems(req, res) {
  const items = await db.all(
    `SELECT li.*, d.first_name, d.last_name
     FROM luggage_items li
     JOIN dut1_records d ON d.id = li.dut1_id
     WHERE li.uploaded_by = $1
     ORDER BY li.uploaded_at DESC
     LIMIT 100`,
    [req.user.id]
  );
  res.json({ items });
}

async function getLuggagePhotoUrl(req, res) {
  try {
    const item = await db.get('SELECT file_path FROM luggage_items WHERE id = $1', [req.params.itemId]);
    if (!item || !item.file_path) {
      return res.status(404).json({ error: 'Bagage ou photo introuvable.' });
    }

    return await storage.streamLuggagePhoto(item.file_path, res);
  } catch (err) {
    console.error(`[luggageController] Erreur récupération photo #${req.params.itemId} :`, err);
    return res.status(500).json({ error: 'Erreur lors du chargement de la photo.' });
  }
}

module.exports = {
  createLuggageItem,
  listLuggageItems,
  listMyLuggageItems,
  deleteLuggageItem,
  setLuggageCount,
  getLuggagePhotoUrl,
};
