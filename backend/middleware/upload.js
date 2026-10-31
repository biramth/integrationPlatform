const multer = require('multer');

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Seuls les fichiers image sont acceptés.'));
  }
  cb(null, true);
}

// Limite à 5 MB côté client/multer — la compression sharp en amont
// (luggageController) réduit typiquement un photo 10 MB en ~300-800 KB JPEG.
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = { upload };
