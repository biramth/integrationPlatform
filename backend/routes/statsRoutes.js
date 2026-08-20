const express = require('express');
const statsController = require('../controllers/statsController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/overview', requireRole('it'), statsController.overview);
router.get('/by-department', requireRole('it'), statsController.byDepartment);
router.get('/by-gender', requireRole('it'), statsController.byGender);
router.get('/rooms-occupancy', requireRole('it'), statsController.roomsOccupancy);
router.get('/illness-trend', requireRole('sante'), statsController.illnessTrend);
router.get('/allergy-prevalence', requireRole('sante'), statsController.allergyPrevalence);
router.get('/by-admission-list', requireRole('it'), statsController.byAdmissionList);

module.exports = router;
