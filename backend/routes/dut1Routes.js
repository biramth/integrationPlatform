const express = require('express');
const dut1Controller = require('../controllers/dut1Controller');
const roomController = require('../controllers/roomController');
const { verifyToken, requireRole, requireOrgaScope } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.post('/', requireRole('orga', 'admin'), requireOrgaScope('enregistrement'), dut1Controller.createRecord);
router.get('/without-luggage', requireRole('orga', 'admin'), requireOrgaScope('bagages'), dut1Controller.listWithoutLuggage);
router.get(
  '/without-complementary',
  requireRole('orga', 'admin'),
  requireOrgaScope('enregistrement'),
  dut1Controller.listWithoutComplementary
);
// Annuaire en lecture : Orga/Santé/Cuisine/Admin voient tout, Communication voit
// tout sauf le médical (allergènes, traitement, champs de la phase 2) — filtré
// dans le contrôleur selon req.user.role, pas ici, pour garder une seule requête.
router.get('/', requireRole('orga', 'sante', 'cuisine', 'admin', 'communication'), dut1Controller.listRecords);
router.get('/export', requireRole('admin'), dut1Controller.exportRecordsCsv);
router.get('/export-contacts', requireRole('admin'), dut1Controller.exportContactsCsv);
router.get('/:id', requireRole('orga', 'sante', 'cuisine', 'admin', 'communication'), dut1Controller.getRecord);
router.get('/:id/room-history', requireRole('admin'), dut1Controller.getRoomHistory);
router.put('/:id', requireRole('admin'), dut1Controller.updateRecord);
router.delete('/:id', requireRole('admin'), dut1Controller.deleteRecord);
router.put(
  '/:id/complementary',
  requireRole('orga', 'admin'),
  requireOrgaScope('enregistrement'),
  dut1Controller.completeComplementary
);
router.put('/:id/allergies', requireRole('orga', 'sante', 'admin'), requireOrgaScope('enregistrement'), dut1Controller.setAllergies);
router.put('/:id/room', requireRole('admin'), roomController.reassignDut1Room);

module.exports = router;
