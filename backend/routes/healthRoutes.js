const express = require('express');
const healthController = require('../controllers/healthController');
const { verifyToken, requireRole, requireSanteScope } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Risques du jour : consultable aussi par Orga, Présidentielle et Dreudj —
// mais seulement pour savoir QUI est à risque aujourd'hui, jamais POURQUOI
// (le détail médical est retiré pour ces rôles dans le contrôleur lui-même,
// cf. NON_MEDICAL_RISK_ROLES). Santé seule voit le détail complet.
router.get('/risks', requireRole('sante', 'orga', 'presidentielle', 'dreudj'), healthController.getRisks);

// Le reste (suivi, déclarer/résoudre une restriction, traitements en cours)
// relève du sous-domaine "suivi" de Santé, pas de "phase2" (qui ne fait que
// déclarer ces infos une fois à l'enregistrement). Le chef de commission y
// garde accès (allowLead) : contrairement aux autres commissions, superviser
// le suivi santé au jour le jour reste son travail, pas seulement celui d'un
// sous-rôle.
router.use(requireRole('sante'), requireSanteScope('suivi', { allowLead: true }));

router.get('/restrictions/active', healthController.listActiveRestrictions);
router.get('/on-treatment', healthController.listOnTreatment);
router.post('/dut1/:id/restrictions', healthController.declareRestriction);
router.get('/dut1/:id/restrictions', healthController.listRestrictionsForDut1);
router.put('/restrictions/:id/resolve', healthController.resolveRestriction);
router.delete('/restrictions/:id', healthController.deleteRestriction);

module.exports = router;
