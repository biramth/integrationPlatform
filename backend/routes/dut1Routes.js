const express = require('express');
const dut1Controller = require('../controllers/dut1Controller');
const roomController = require('../controllers/roomController');
const { verifyToken, requireRole, requireOrgaScope, requireSanteScope, requireCommissionLead } = require('../middleware/auth');
const { requireFeatureEnabled } = require('../middleware/platformSettings');

const router = express.Router();

router.use(verifyToken);

// L'enregistrement n'a d'utilité que le premier jour : IT peut le désactiver
// une fois la saisie terminée pour empêcher toute nouvelle fiche après coup
// (cf. requireFeatureEnabled — refuse même IT, pas de bypass ici).
router.post('/', requireRole('orga'), requireOrgaScope('enregistrement'), requireFeatureEnabled('registration'), dut1Controller.createRecord);
router.get('/without-luggage', requireRole('orga'), requireOrgaScope('bagages'), dut1Controller.listWithoutLuggage);
// Sous-rôle Orga "chambres" : livrer, dans la chambre déjà assignée à chaque
// DUT1, les bagages que l'agent "bagages" a photographiés, puis confirmer le
// dépôt — pas de configuration des chambres elles-mêmes (cf. roomRoutes.js).
router.get('/pending-delivery', requireRole('orga'), requireOrgaScope('chambres'), dut1Controller.listPendingDelivery);
router.get('/deliveries/mine', requireRole('orga'), requireOrgaScope('chambres'), dut1Controller.listMyDeliveries);
// Phase 2 (complément de dossier) relève de la commission Santé — traitement
// médical, allergies — pas d'Orga (qui ne gère plus que
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
// Historique des chambres : outil de gestion des chambres du chef Orga (et
// IT via son bypass), pas la tâche quotidienne du sous-rôle "chambres" (qui
// ne fait que livrer les bagages, cf. requireOrgaScope) — cf. /:id/room ci-dessous.
router.get('/:id/room-history', requireRole('orga'), requireCommissionLead, dut1Controller.getRoomHistory);
router.put('/:id', requireRole('it'), dut1Controller.updateRecord);
// IT peut toujours supprimer n'importe quel dossier. Un agent Orga peut aussi
// supprimer un dossier — mais seulement le sien (celui qu'il a enregistré) et
// seulement tant qu'aucune autre commission n'a construit dessus : la
// vérification fine (propriétaire + absence de dépendances) vit dans le
// contrôleur, pas ici.
router.delete('/:id', requireRole('it', 'orga'), requireOrgaScope('enregistrement'), dut1Controller.deleteRecord);
// Même principe que l'enregistrement : phase 2 n'a d'utilité que le premier
// jour, IT peut la désactiver une fois la saisie terminée.
router.put(
  '/:id/complementary',
  requireRole('sante'),
  requireSanteScope('phase2'),
  requireFeatureEnabled('phase2'),
  dut1Controller.completeComplementary
);
router.put('/:id/allergies', requireRole('sante'), requireSanteScope('phase2'), dut1Controller.setAllergies);
// Réassignation de chambre : outil de gestion du chef Orga (regrouper des
// DUT1, corriger une erreur d'affectation), pas la tâche quotidienne du
// sous-rôle "chambres" — celui-ci livre les bagages déjà photographiés dans
// la chambre déjà assignée, il ne réassigne pas (cf. /:id/luggage-delivery).
router.put('/:id/room', requireRole('orga'), requireCommissionLead, roomController.reassignDut1Room);
router.put(
  '/:id/luggage-delivery',
  requireRole('orga'),
  requireOrgaScope('chambres'),
  dut1Controller.confirmLuggageDelivery
);

module.exports = router;
