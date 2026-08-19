const express = require('express');
const importController = require('../controllers/importController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadSpreadsheet } = require('../middleware/uploadSpreadsheet');

const router = express.Router();

router.use(verifyToken, requireRole('admin'));

router.post('/admitted-students/preview', uploadSpreadsheet.single('file'), importController.previewAdmittedStudents);
router.post('/admitted-students/confirm', importController.confirmAdmittedStudents);
router.post('/rooms/preview', uploadSpreadsheet.single('file'), importController.previewRooms);
router.post('/rooms/confirm', importController.confirmRooms);

module.exports = router;
