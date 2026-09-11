const express = require('express');
const statsController = require('../controllers/statsController');
const { verifyToken, requireRole, requireSanteScope } = require('../middleware/auth');
const { cached } = require('../middleware/cache');

const router = express.Router();

router.use(verifyToken);

// Chaque chef de commission a une vue d'ensemble sur sa sphère : Orga (logistique,
// enregistrement, bagages) et Présidentielle partagent les mêmes statistiques
// globales non-médicales. Les statistiques médicales (illness-trend,
// allergy-prevalence) restent réservées à Santé, cf. principe "le médical reste
// médical". Cuisine, Culturelle et Communication n'ont pas de tableau de bord :
// rien à y voir.
const OVERVIEW_ROLES = ['orga', 'presidentielle'];

// Cache : 30s pour les stats globales (chambres, dossiers), 60s pour les
// répartitions (département, genre) qui changent moins souvent.
router.get('/overview', requireRole(...OVERVIEW_ROLES), cached(30_000), statsController.overview);
router.get('/health-overview', requireRole('sante'), requireSanteScope('suivi', { allowLead: true }), cached(30_000), statsController.healthOverview);
router.get('/by-department', requireRole(...OVERVIEW_ROLES), cached(60_000), statsController.byDepartment);
router.get('/by-gender', requireRole(...OVERVIEW_ROLES), cached(60_000), statsController.byGender);
// Le sous-rôle Orga "logistique" ne configure plus les chambres (cf.
// roomRoutes.js) : pas de raison de le scoper spécifiquement ici, cette
// statistique suit le même accès que les autres compteurs de la Vue
// d'ensemble (réservée au chef côté front, cf. RoleRoute requireLead).
router.get('/rooms-occupancy', requireRole(...OVERVIEW_ROLES), cached(30_000), statsController.roomsOccupancy);
router.get('/illness-trend', requireRole('sante'), requireSanteScope('suivi', { allowLead: true }), cached(60_000), statsController.illnessTrend);
router.get('/allergy-prevalence', requireRole('sante'), requireSanteScope('suivi', { allowLead: true }), cached(60_000), statsController.allergyPrevalence);

module.exports = router;
