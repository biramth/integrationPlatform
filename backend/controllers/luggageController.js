const db = require('../db/database');
const storage = require('../services/storageService');

async function createLuggageItem(req, res) {
  const { id } = req.params;
  const record = await db.get('SELECT id FROM dut1_records WHERE id = $1', [id]);

  if (!record) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Fichier photo requis (champ "photo").' });
  }

  const isSensitive = req.body.isSensitive === 'true' || req.body.isSensitive === '1';
  const objectPath = await storage.uploadLuggagePhoto(id, req.file);

  const result = await db.run(
    `INSERT INTO luggage_items (dut1_id, file_path, original_name, is_sensitive, sensitive_note, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [id, objectPath, req.file.originalname, isSensitive, req.body.sensitiveNote || null, req.user.id]
  );

  const item = await db.get('SELECT * FROM luggage_items WHERE id = $1', [result.rows[0].id]);
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
  res.status(204).send();
}

async function setLuggageCount(req, res) {
  const { id } = req.params;
  const { luggageCount } = req.body;

  const count = luggageCount === null || luggageCount === undefined || luggageCount === '' ? null : Number(luggageCount);
  if (count !== null && (!Number.isInteger(count) || count < 0)) {
    return res.status(400).json({ error: 'luggageCount doit être un entier positif ou nul.' });
  }

  const result = await db.run(
    `UPDATE dut1_records SET luggage_count = $1, updated_at = NOW() WHERE id = $2`,
    [count, id]
  );

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  const record = await db.get('SELECT id, luggage_count FROM dut1_records WHERE id = $1', [id]);
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
  const item = await db.get('SELECT file_path FROM luggage_items WHERE id = $1', [req.params.itemId]);
  if (!item) {
    return res.status(404).json({ error: 'Bagage introuvable.' });
  }

  const url = await storage.getSignedUrl(item.file_path);
  res.redirect(url);
}

module.exports = {
  createLuggageItem,
  listLuggageItems,
  listMyLuggageItems,
  deleteLuggageItem,
  setLuggageCount,
  getLuggagePhotoUrl,
};
