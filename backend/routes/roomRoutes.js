const express = require('express');
const roomController = require('../controllers/roomController');
const { verifyToken, requireRole, requireOrgaScope } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Les chambres (ajout, modification, suppression, historique) sont gérées par
// la commission Orga au quotidien, pas seulement par IT — cf. requireOrgaScope
// pour restreindre un agent Orga au sous-domaine "chambres" s'il y est limité.
router.get('/', requireRole('orga'), requireOrgaScope('chambres'), roomController.listRooms);
router.post('/', requireRole('orga'), requireOrgaScope('chambres'), roomController.createRoom);
router.put('/:id', requireRole('orga'), requireOrgaScope('chambres'), roomController.updateRoom);
router.put(
  '/:id/mattress-count',
  requireRole('orga'),
  requireOrgaScope('chambres'),
  roomController.updateMattressCount
);
router.get('/:id/history', requireRole('orga'), requireOrgaScope('chambres'), roomController.getRoomHistory);
router.delete('/:id', requireRole('orga'), requireOrgaScope('chambres'), roomController.deleteRoom);

module.exports = router;
