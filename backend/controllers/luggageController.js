const db = require('../db/database');
const fs = require('fs');
const path = require('path');

function createLuggageItem(req, res) {
  const { id } = req.params;
  const record = db.prepare('SELECT id FROM dut1_records WHERE id = ?').get(id);

  if (!record) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Fichier photo requis (champ "photo").' });
  }

  const relativePath = path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/');
  const isSensitive = req.body.isSensitive === 'true' || req.body.isSensitive === '1';

  const result = db
    .prepare(
      `INSERT INTO luggage_items (dut1_id, file_path, original_name, is_sensitive, sensitive_note, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, relativePath, req.file.originalname, isSensitive ? 1 : 0, req.body.sensitiveNote || null, req.user.id);

  const item = db.prepare('SELECT * FROM luggage_items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ item });
}

function listLuggageItems(req, res) {
  const items = db
    .prepare('SELECT * FROM luggage_items WHERE dut1_id = ? ORDER BY uploaded_at ASC')
    .all(req.params.id);
  res.json({ items });
}

function deleteLuggageItem(req, res) {
  const item = db.prepare('SELECT * FROM luggage_items WHERE id = ?').get(req.params.itemId);
  if (!item) {
    return res.status(404).json({ error: 'Bagage introuvable.' });
  }

  const absolutePath = path.join(__dirname, '..', item.file_path);
  fs.rm(absolutePath, { force: true }, () => {});

  db.prepare('DELETE FROM luggage_items WHERE id = ?').run(req.params.itemId);
  res.status(204).send();
}

function setLuggageCount(req, res) {
  const { id } = req.params;
  const { luggageCount } = req.body;

  const count = luggageCount === null || luggageCount === undefined || luggageCount === '' ? null : Number(luggageCount);
  if (count !== null && (!Number.isInteger(count) || count < 0)) {
    return res.status(400).json({ error: 'luggageCount doit être un entier positif ou nul.' });
  }

  const result = db
    .prepare(`UPDATE dut1_records SET luggage_count = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(count, id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  const record = db.prepare('SELECT id, luggage_count FROM dut1_records WHERE id = ?').get(id);
  res.json({ record });
}

module.exports = {
  createLuggageItem,
  listLuggageItems,
  deleteLuggageItem,
  setLuggageCount,
};
