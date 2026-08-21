const express = require('express');
const statsController = require('../controllers/statsController');
const { verifyToken, requireRole, requireOrgaScope } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// La commission Présidentielle a une vue d'ensemble globale (comptes, chambres,
// répartitions) mais pas sur les statistiques médicales (illness-trend,
// allergy-prevalence restent réservées à Santé, cf. principe "le médical
// reste médical").
router.get('/overview', requireRole('presidentielle'), statsController.overview);
router.get('/by-department', requireRole('presidentielle'), statsController.byDepartment);
router.get('/by-gender', requireRole('presidentielle'), statsController.byGender);
router.get(
  '/rooms-occupancy',
  requireRole('orga', 'presidentielle'),
  requireOrgaScope('chambres'),
  statsController.roomsOccupancy
);
router.get('/illness-trend', requireRole('sante'), statsController.illnessTrend);
router.get('/allergy-prevalence', requireRole('sante'), statsController.allergyPrevalence);
router.get('/by-admission-list', requireRole('presidentielle'), statsController.byAdmissionList);

module.exports = router;
