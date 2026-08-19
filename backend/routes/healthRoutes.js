const express = require('express');
const healthController = require('../controllers/healthController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireRole('sante', 'admin'));

router.get('/risks', healthController.getRisks);
router.get('/restrictions/active', healthController.listActiveRestrictions);
router.post('/dut1/:id/restrictions', healthController.declareRestriction);
router.get('/dut1/:id/restrictions', healthController.listRestrictionsForDut1);
router.put('/restrictions/:id/resolve', healthController.resolveRestriction);
router.delete('/restrictions/:id', healthController.deleteRestriction);

module.exports = router;
