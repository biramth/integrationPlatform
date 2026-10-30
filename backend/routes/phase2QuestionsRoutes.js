const express = require('express');
const controller = require('../controllers/phase2QuestionsController');
const { verifyToken, requireRole, requireSanteScope, requireCommissionLead } = require('../middleware/auth');
const { cached } = require('../middleware/cache');

const router = express.Router();

router.use(verifyToken);

// Questionnaire de référence, relu à chaque ouverture du formulaire phase 2 :
// 60 s de cache, vidé par toute modification de question (auditService).
router.get('/', requireRole('sante'), cached(60_000), controller.listQuestions);
router.post('/', requireRole('sante'), requireSanteScope('phase2', { allowLead: true }), requireCommissionLead, controller.createQuestion);
// /reorder avant /:id : sinon Express matcherait "reorder" comme un id.
router.put('/reorder', requireRole('sante'), requireSanteScope('phase2', { allowLead: true }), requireCommissionLead, controller.reorderQuestions);
router.put('/:id', requireRole('sante'), requireSanteScope('phase2', { allowLead: true }), requireCommissionLead, controller.updateQuestion);
router.delete('/:id', requireRole('sante'), requireSanteScope('phase2', { allowLead: true }), requireCommissionLead, controller.deleteQuestion);

module.exports = router;
