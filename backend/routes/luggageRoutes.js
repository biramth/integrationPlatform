const express = require('express');
const luggageController = require('../controllers/luggageController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.use(verifyToken);

router.put('/dut1/:id/luggage-count', requireRole('logistics', 'admin'), luggageController.setLuggageCount);
router.post(
  '/dut1/:id/luggage-items',
  requireRole('logistics', 'admin'),
  upload.single('photo'),
  luggageController.createLuggageItem
);
router.get('/dut1/:id/luggage-items', luggageController.listLuggageItems);
router.get('/luggage-items/mine', requireRole('logistics', 'admin'), luggageController.listMyLuggageItems);
router.get('/luggage-items/:itemId/photo', luggageController.getLuggagePhotoUrl);
router.delete('/luggage-items/:itemId', requireRole('logistics', 'admin'), luggageController.deleteLuggageItem);

module.exports = router;
