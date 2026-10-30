const express = require('express');
const healthController = require('../controllers/healthController');
const treatmentController = require('../controllers/treatmentController');
const { verifyToken, requireRole, requireSanteScope } = require('../middleware/auth');
const { cached } = require('../middleware/cache');

const router = express.Router();

router.use(verifyToken);

// Cache court (10–15 s) sur toutes les lectures du suivi santé. Ces écrans sont
// rechargés en même temps par plusieurs agents à chaque événement temps réel :
// sans cache, chaque navigateur déclenchait sa propre salve SQL sur une instance
// Render à 0,1 CPU. Toute mutation passe par auditService.logAction, qui vide
// ce cache AVANT de diffuser « data_changed » : les navigateurs qui rechargent
// en réaction obtiennent donc bien la donnée à jour.
const SUIVI_TTL_MS = 10_000;

// Risques du jour : consultable aussi par Orga, Présidentielle et Dreudj —
// mais seulement pour savoir QUI est à risque aujourd'hui, jamais POURQUOI
// (le détail médical est retiré pour ces rôles dans le contrôleur lui-même,
// cf. NON_MEDICAL_RISK_ROLES). Santé seule voit le détail complet.
router.get('/risks', requireRole('sante', 'orga', 'presidentielle', 'dreudj'), cached(SUIVI_TTL_MS), healthController.getRisks);

// Le reste (suivi, déclarer/résoudre une restriction, traitements en cours)
// relève du sous-domaine "suivi" de Santé, pas de "phase2" (qui ne fait que
// déclarer ces infos une fois à l'enregistrement). Le chef de commission y
// garde accès (allowLead) : contrairement aux autres commissions, superviser
// le suivi santé au jour le jour reste son travail, pas seulement celui d'un
// sous-rôle.
router.use(requireRole('sante'), requireSanteScope('suivi', { allowLead: true }));

router.get('/restrictions/active', cached(SUIVI_TTL_MS), healthController.listActiveRestrictions);
router.get('/on-treatment', cached(SUIVI_TTL_MS), healthController.listOnTreatment);
router.post('/dut1/:id/restrictions', healthController.declareRestriction);
router.get('/dut1/:id/restrictions', cached(SUIVI_TTL_MS), healthController.listRestrictionsForDut1);
router.put('/restrictions/:id/resolve', healthController.resolveRestriction);
router.delete('/restrictions/:id', healthController.deleteRestriction);

// Suivi des traitements : CRUD, prises du jour par créneau (matin/midi/soir)
// et cochage des prises — tout relève de "suivi" (travail santé quotidien),
// pas de "medoc" (le stock, géré séparément par son responsable ; marquer une
// prise ne touche jamais au stock).
router.get('/treatments', cached(SUIVI_TTL_MS), treatmentController.listTreatments);
router.post('/treatments', treatmentController.createTreatment);
router.get('/treatments/schedule', cached(SUIVI_TTL_MS), treatmentController.getSchedule);
router.put('/treatments/:id/intake', treatmentController.markIntake);
router.put('/treatments/:id/end', treatmentController.endTreatment);
router.put('/treatments/:id', treatmentController.updateTreatment);
router.delete('/treatments/:id', treatmentController.deleteTreatment);

module.exports = router;
