const express = require('express');
const statsController = require('../controllers/statsController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/overview', requireRole('admin'), statsController.overview);
router.get('/by-department', requireRole('admin'), statsController.byDepartment);
router.get('/by-gender', requireRole('admin'), statsController.byGender);
router.get('/rooms-occupancy', requireRole('admin'), statsController.roomsOccupancy);
router.get('/illness-trend', requireRole('sante', 'admin'), statsController.illnessTrend);
router.get('/allergy-prevalence', requireRole('sante', 'admin'), statsController.allergyPrevalence);
router.get('/completion-by-department', requireRole('admin'), statsController.completionByDepartment);

module.exports = router;
