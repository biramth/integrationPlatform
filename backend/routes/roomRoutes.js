const express = require('express');
const roomController = require('../controllers/roomController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/', requireRole('logistics', 'admin'), roomController.listRooms);
router.post('/', requireRole('admin'), roomController.createRoom);
router.put('/:id', requireRole('admin'), roomController.updateRoom);
router.put('/:id/mattress-count', requireRole('logistics', 'admin'), roomController.updateMattressCount);
router.delete('/:id', requireRole('admin'), roomController.deleteRoom);

module.exports = router;
