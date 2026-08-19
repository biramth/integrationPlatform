const multer = require('multer');

function fileFilter(req, file, cb) {
  if (file.mimetype !== 'application/pdf') {
    return cb(new Error('Seuls les fichiers PDF sont acceptés.'));
  }
  cb(null, true);
}

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

module.exports = { uploadPdf };
