const express = require('express');
const healthController = require('../controllers/healthController');
const { verifyToken, requireRole, requireSanteScope } = require('../middleware/auth');

const router = express.Router();

// Risques du jour, suivi et traitements en cours relèvent du sous-domaine
// "suivi" de Santé, pas de "phase2" (qui ne fait que déclarer ces infos une
// fois à l'enregistrement). Le chef de commission y garde accès (allowLead) :
// contrairement aux autres commissions, superviser le suivi santé au jour le
// jour reste son travail, pas seulement celui d'un sous-rôle.
router.use(verifyToken, requireRole('sante'), requireSanteScope('suivi', { allowLead: true }));

router.get('/risks', healthController.getRisks);
router.get('/restrictions/active', healthController.listActiveRestrictions);
router.get('/on-treatment', healthController.listOnTreatment);
router.post('/dut1/:id/restrictions', healthController.declareRestriction);
router.get('/dut1/:id/restrictions', healthController.listRestrictionsForDut1);
router.put('/restrictions/:id/resolve', healthController.resolveRestriction);
router.delete('/restrictions/:id', healthController.deleteRestriction);

module.exports = router;
