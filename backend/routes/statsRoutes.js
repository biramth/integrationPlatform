const express = require('express');
const statsController = require('../controllers/statsController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireRole('admin'));

router.get('/overview', statsController.overview);
router.get('/by-department', statsController.byDepartment);
router.get('/by-gender', statsController.byGender);
router.get('/rooms-occupancy', statsController.roomsOccupancy);
router.get('/illness-trend', statsController.illnessTrend);
router.get('/allergy-prevalence', statsController.allergyPrevalence);
router.get('/completion-by-department', statsController.completionByDepartment);

module.exports = router;
