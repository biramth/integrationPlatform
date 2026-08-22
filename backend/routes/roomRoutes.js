const express = require('express');
const roomController = require('../controllers/roomController');
const { verifyToken, requireRoleStrict, requireCommissionLeadStrict } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Configurer les chambres (créer/modifier/supprimer/matelas/historique) est un
// travail de mise en place, réservé au chef de la commission Orga — pas à
// n'importe quel agent Orga, et pas à IT même via son bypass superutilisateur
// habituel (requireRoleStrict, pas requireRole). Le sous-rôle "chambres" ne
// donne PAS ce droit : son travail quotidien est de livrer, dans la chambre
// déjà assignée à chaque DUT1, les bagages que l'agent "bagages" a
// photographiés — cf. dut1Controller.listPendingDelivery / confirmLuggageDelivery.
router.get('/', requireRoleStrict('orga'), requireCommissionLeadStrict, roomController.listRooms);
router.post('/', requireRoleStrict('orga'), requireCommissionLeadStrict, roomController.createRoom);
router.put('/:id', requireRoleStrict('orga'), requireCommissionLeadStrict, roomController.updateRoom);
router.put(
  '/:id/mattress-count',
  requireRoleStrict('orga'),
  requireCommissionLeadStrict,
  roomController.updateMattressCount
);
router.get('/:id/history', requireRoleStrict('orga'), requireCommissionLeadStrict, roomController.getRoomHistory);
router.delete('/:id', requireRoleStrict('orga'), requireCommissionLeadStrict, roomController.deleteRoom);

module.exports = router;
