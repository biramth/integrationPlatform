const express = require('express');
const importController = require('../controllers/importController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadPdf } = require('../middleware/uploadPdf');

const router = express.Router();

router.use(verifyToken, requireRole('admin'));

router.post('/admitted-students/preview', uploadPdf.single('pdf'), importController.previewAdmittedStudents);
router.post('/admitted-students/confirm', importController.confirmAdmittedStudents);
router.post('/rooms/preview', uploadPdf.single('pdf'), importController.previewRooms);
router.post('/rooms/confirm', importController.confirmRooms);

module.exports = router;
