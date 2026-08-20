const express = require('express');
const roomController = require('../controllers/roomController');
const { verifyToken, requireRole, requireOrgaScope } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/', requireRole('orga', 'admin'), requireOrgaScope('chambres'), roomController.listRooms);
router.post('/', requireRole('admin'), roomController.createRoom);
router.put('/:id', requireRole('admin'), roomController.updateRoom);
router.put(
  '/:id/mattress-count',
  requireRole('orga', 'admin'),
  requireOrgaScope('chambres'),
  roomController.updateMattressCount
);
router.get('/:id/history', requireRole('admin'), roomController.getRoomHistory);
router.delete('/:id', requireRole('admin'), roomController.deleteRoom);

module.exports = router;
