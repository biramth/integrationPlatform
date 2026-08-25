const express = require('express');
const dut1Controller = require('../controllers/dut1Controller');
const roomController = require('../controllers/roomController');
const { verifyToken, requireRole, requireOrgaScope, requireSanteScope, requireCommissionLead } = require('../middleware/auth');
const { requireFeatureEnabled } = require('../middleware/platformSettings');
const { cached } = require('../middleware/cache');

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
// Liste légère des chambres compatibles (même genre, places libres) pour
// l'UI de déplacement : le chef Orga comme l'agent qui a enregistré un dossier
// en ont besoin sans accéder à la configuration complète des chambres
// (création/édition/suppression restent au chef, cf. roomRoutes.js).
router.get('/available-rooms', requireRole('orga'), roomController.listAvailableRooms);
// Phase 2 (complément de dossier) relève de la commission Santé — traitement
// médical, allergies — pas d'Orga (qui ne gère plus que
// l'enregistrement de base, les chambres et les bagages).
router.get(
  '/without-complementary',
  requireRole('sante'),
  requireSanteScope('phase2', { allowLead: true }),
  dut1Controller.listWithoutComplementary
);
// Annuaire en lecture : Orga/Santé/Cuisine voient tout, Communication et
// Présidentielle voient tout sauf le médical (allergènes, traitement, champs
// de la phase 2) — filtré dans le contrôleur selon req.user.role, pas ici,
// pour garder une seule requête.
router.get('/', requireRole('orga', 'sante', 'cuisine', 'communication', 'presidentielle'), cached(15_000), dut1Controller.listRecords);
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
// Comme l'enregistrement, la phase 2 n'a d'utilité que le premier jour et IT
// peut la désactiver une fois la saisie terminée — mais un dossier déjà
// complété reste corrigible par le chef de commission après coup (un DUT1 ne
// dit pas toujours tout du premier coup), y compris si la phase 2 a depuis
// été désactivée : cf. la logique fine dans completeComplementary lui-même,
// pas de requireFeatureEnabled ici.
router.put(
  '/:id/complementary',
  requireRole('sante'),
  requireSanteScope('phase2', { allowLead: true }),
  dut1Controller.completeComplementary
);
router.put(
  '/:id/allergies',
  requireRole('sante'),
  requireSanteScope('phase2', { allowLead: true }),
  dut1Controller.setAllergies
);
router.put(
  '/:id/aptitude-criteria',
  requireRole('sante'),
  requireSanteScope('phase2', { allowLead: true }),
  dut1Controller.setAptitudeLevels
);
// Réassignation de chambre : le chef Orga regroupe des DUT1 et corrige les
// erreurs d'affectation ; l'agent qui a enregistré un dossier peut aussi
// déplacer celui-ci — même logique que la suppression ci-dessus, il ne touche
// pas aux dossiers des autres. La vérification fine (chef vs créateur du
// dossier) vit dans reassignDut1Room : un simple middleware ne peut pas la
// porter (elle dépend du dossier visé).
router.put('/:id/room', requireRole('orga'), roomController.reassignDut1Room);
// Comme l'enregistrement et les bagages, la livraison en chambre n'a
// d'utilité que le premier jour — IT peut la désactiver une fois la
// logistique terminée (cf. requireFeatureEnabled, refuse même IT).
router.put(
  '/:id/luggage-delivery',
  requireRole('orga'),
  requireOrgaScope('chambres'),
  requireFeatureEnabled('logistics'),
  dut1Controller.confirmLuggageDelivery
);

module.exports = router;
