const express = require('express');
const statsController = require('../controllers/statsController');
const { verifyToken, requireRole, requireSanteScope } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Chaque chef de commission a une vue d'ensemble sur sa sphère : Orga (chambres,
// enregistrement, bagages), Communication et Présidentielle partagent les mêmes
// statistiques globales non-médicales. Les statistiques médicales (illness-trend,
// allergy-prevalence) restent réservées à Santé, cf. principe "le médical reste
// médical". Cuisine et Culturelle n'ont pas de tableau de bord : rien à y voir.
const OVERVIEW_ROLES = ['orga', 'communication', 'presidentielle'];

router.get('/overview', requireRole(...OVERVIEW_ROLES), statsController.overview);
router.get('/by-department', requireRole(...OVERVIEW_ROLES), statsController.byDepartment);
router.get('/by-gender', requireRole(...OVERVIEW_ROLES), statsController.byGender);
// Le sous-rôle Orga "chambres" ne configure plus les chambres (cf.
// roomRoutes.js) : pas de raison de le scoper spécifiquement ici, cette
// statistique suit le même accès que les autres compteurs de la Vue
// d'ensemble (réservée au chef côté front, cf. RoleRoute requireLead).
router.get('/rooms-occupancy', requireRole(...OVERVIEW_ROLES), statsController.roomsOccupancy);
router.get('/illness-trend', requireRole('sante'), requireSanteScope('suivi', { allowLead: true }), statsController.illnessTrend);
router.get('/allergy-prevalence', requireRole('sante'), requireSanteScope('suivi', { allowLead: true }), statsController.allergyPrevalence);

module.exports = router;
