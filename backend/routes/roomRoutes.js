const express = require('express');
const roomController = require('../controllers/roomController');
const { verifyToken, requireRole, requireOrgaScope } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/', requireRole('orga'), requireOrgaScope('chambres'), roomController.listRooms);
router.post('/', requireRole('it'), roomController.createRoom);
router.put('/:id', requireRole('it'), roomController.updateRoom);
router.put(
  '/:id/mattress-count',
  requireRole('orga'),
  requireOrgaScope('chambres'),
  roomController.updateMattressCount
);
router.get('/:id/history', requireRole('it'), roomController.getRoomHistory);
router.delete('/:id', requireRole('it'), roomController.deleteRoom);

module.exports = router;
