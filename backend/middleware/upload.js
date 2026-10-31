const multer = require('multer');

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Seuls les fichiers image sont acceptés.'));
  }
  cb(null, true);
}

// Limite à 20 Mo côté multer pour accepter les clichés bruts des smartphones récents.
// Sharp compresse ensuite l'image en JPEG ~300-800 KB avant stockage.
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

module.exports = { upload };
