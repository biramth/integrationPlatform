const db = require('../db/database');
const fs = require('fs');
const path = require('path');
const { uploadDir } = require('../middleware/upload');

function uploadPhoto(req, res) {
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

  const result = db
    .prepare(
      `INSERT INTO luggage_photos (dut1_id, file_path, original_name, uploaded_by)
       VALUES (?, ?, ?, ?)`
    )
    .run(id, relativePath, req.file.originalname, req.user.id);

  const photo = db.prepare('SELECT * FROM luggage_photos WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ photo });
}

function listPhotos(req, res) {
  const photos = db
    .prepare('SELECT * FROM luggage_photos WHERE dut1_id = ? ORDER BY uploaded_at ASC')
    .all(req.params.id);
  res.json({ photos });
}

function deletePhoto(req, res) {
  const photo = db.prepare('SELECT * FROM luggage_photos WHERE id = ?').get(req.params.photoId);
  if (!photo) {
    return res.status(404).json({ error: 'Photo introuvable.' });
  }

  const absolutePath = path.join(__dirname, '..', photo.file_path);
  fs.rm(absolutePath, { force: true }, () => {});

  db.prepare('DELETE FROM luggage_photos WHERE id = ?').run(req.params.photoId);
  res.status(204).send();
}

module.exports = { uploadPhoto, listPhotos, deletePhoto };
