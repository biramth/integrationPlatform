const multer = require('multer');

const XLSX_MIMETYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function fileFilter(req, file, cb) {
  const isXlsxMimetype = file.mimetype === XLSX_MIMETYPE;
  const isXlsxExtension = /\.xlsx$/i.test(file.originalname || '');
  if (!isXlsxMimetype && !isXlsxExtension) {
    return cb(new Error('Seuls les fichiers Excel (.xlsx) sont acceptés.'));
  }
  cb(null, true);
}

const uploadSpreadsheet = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

module.exports = { uploadSpreadsheet };
