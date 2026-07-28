const express = require('express');
const luggageController = require('../controllers/luggageController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.use(verifyToken);

router.post(
  '/dut1/:id/luggage-photos',
  requireRole('logistics', 'admin'),
  upload.single('photo'),
  luggageController.uploadPhoto
);
router.get('/dut1/:id/luggage-photos', luggageController.listPhotos);
router.delete('/luggage-photos/:photoId', requireRole('admin'), luggageController.deletePhoto);

module.exports = router;
