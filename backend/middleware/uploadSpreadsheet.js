const multer = require('multer');

const XLSX_MIMETYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CSV_MIMETYPE = 'text/csv';

function fileFilter(req, file, cb) {
  const isXlsxMimetype = file.mimetype === XLSX_MIMETYPE;
  const isXlsxExtension = /\.xlsx$/i.test(file.originalname || '');
  const isCsvMimetype = file.mimetype === CSV_MIMETYPE || file.mimetype === 'application/csv' || file.mimetype === 'text/plain';
  const isCsvExtension = /\.csv$/i.test(file.originalname || '');
  
  if (!isXlsxMimetype && !isXlsxExtension && !isCsvMimetype && !isCsvExtension) {
    return cb(new Error('Seuls les fichiers Excel (.xlsx) et CSV (.csv) sont acceptés.'));
  }
  cb(null, true);
}

const uploadSpreadsheet = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

module.exports = { uploadSpreadsheet };
