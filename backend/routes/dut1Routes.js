const express = require('express');
const dut1Controller = require('../controllers/dut1Controller');
const roomController = require('../controllers/roomController');
const { verifyToken, requireRole, requireOrgaScope, requireSanteScope } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.post('/', requireRole('orga'), requireOrgaScope('enregistrement'), dut1Controller.createRecord);
router.get('/without-luggage', requireRole('orga'), requireOrgaScope('bagages'), dut1Controller.listWithoutLuggage);
// Sous-rôle Orga "chambres" : livrer, dans la chambre déjà assignée à chaque
// DUT1, les bagages que l'agent "bagages" a photographiés, puis confirmer le
// dépôt — pas de configuration des chambres elles-mêmes (cf. roomRoutes.js).
router.get('/pending-delivery', requireRole('orga'), requireOrgaScope('chambres'), dut1Controller.listPendingDelivery);
router.get('/deliveries/mine', requireRole('orga'), requireOrgaScope('chambres'), dut1Controller.listMyDeliveries);
// Phase 2 (complément de dossier) relève de la commission Santé — traitement
// médical, allergies, admission — pas d'Orga (qui ne gère plus que
// l'enregistrement de base, les chambres et les bagages).
router.get(
  '/without-complementary',
  requireRole('sante'),
  requireSanteScope('phase2'),
  dut1Controller.listWithoutComplementary
);
// Annuaire en lecture : Orga/Santé/Cuisine voient tout, Communication et
// Présidentielle voient tout sauf le médical (allergènes, traitement, champs
// de la phase 2) — filtré dans le contrôleur selon req.user.role, pas ici,
// pour garder une seule requête.
router.get('/', requireRole('orga', 'sante', 'cuisine', 'communication', 'presidentielle'), dut1Controller.listRecords);
router.get('/export', requireRole('it'), dut1Controller.exportRecordsCsv);
router.get('/export-contacts', requireRole('it'), dut1Controller.exportContactsCsv);
router.get('/:id', requireRole('orga', 'sante', 'cuisine', 'communication', 'presidentielle'), dut1Controller.getRecord);
router.get('/:id/room-history', requireRole('orga'), requireOrgaScope('chambres'), dut1Controller.getRoomHistory);
router.put('/:id', requireRole('it'), dut1Controller.updateRecord);
// IT peut toujours supprimer n'importe quel dossier. Un agent Orga peut aussi
// supprimer un dossier — mais seulement le sien (celui qu'il a enregistré) et
// seulement tant qu'aucune autre commission n'a construit dessus : la
// vérification fine (propriétaire + absence de dépendances) vit dans le
// contrôleur, pas ici.
router.delete('/:id', requireRole('it', 'orga'), requireOrgaScope('enregistrement'), dut1Controller.deleteRecord);
router.put(
  '/:id/complementary',
  requireRole('sante'),
  requireSanteScope('phase2'),
  dut1Controller.completeComplementary
);
router.put('/:id/allergies', requireRole('sante'), requireSanteScope('phase2'), dut1Controller.setAllergies);
router.put('/:id/room', requireRole('orga'), requireOrgaScope('chambres'), roomController.reassignDut1Room);
router.put(
  '/:id/luggage-delivery',
  requireRole('orga'),
  requireOrgaScope('chambres'),
  dut1Controller.confirmLuggageDelivery
);

module.exports = router;
