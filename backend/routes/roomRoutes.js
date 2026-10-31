const express = require('express');
const roomController = require('../controllers/roomController');
const { verifyToken, requireRole, requireCommissionLead } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Consultation des chambres : ouverte à tous les agents connectés (affichage des dossiers,
// filtres, assignation). Gestion réservée au chef Orga et à IT.
router.get('/', roomController.listRooms);
router.post('/', requireRole('orga', 'it'), requireCommissionLead, roomController.createRoom);
router.put('/:id', requireRole('orga', 'it'), requireCommissionLead, roomController.updateRoom);
router.put(
  '/:id/mattress-count',
  requireRole('orga', 'it'),
  requireCommissionLead,
  roomController.updateMattressCount
);
router.get('/:id/history', requireRole('orga', 'it'), roomController.getRoomHistory);
router.delete('/:id', requireRole('orga', 'it'), requireCommissionLead, roomController.deleteRoom);

module.exports = router;
