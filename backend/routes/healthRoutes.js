const express = require('express');
const healthController = require('../controllers/healthController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireRole('sante', 'admin'));

router.get('/risks', healthController.getRisks);
router.get('/illness', healthController.listIllnessByDate);
router.post('/dut1/:id/illness', healthController.declareIllness);
router.get('/dut1/:id/illness', healthController.listIllnessForDut1);

module.exports = router;
