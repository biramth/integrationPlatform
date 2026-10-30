const express = require('express');
const controller = require('../controllers/phase2QuestionsController');
const { verifyToken, requireRole, requireSanteScope, requireCommissionLead } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/', requireRole('sante'), controller.listQuestions);
router.post('/', requireRole('sante'), requireSanteScope('phase2', { allowLead: true }), requireCommissionLead, controller.createQuestion);
// /reorder avant /:id : sinon Express matcherait "reorder" comme un id.
router.put('/reorder', requireRole('sante'), requireSanteScope('phase2', { allowLead: true }), requireCommissionLead, controller.reorderQuestions);
router.put('/:id', requireRole('sante'), requireSanteScope('phase2', { allowLead: true }), requireCommissionLead, controller.updateQuestion);
router.delete('/:id', requireRole('sante'), requireSanteScope('phase2', { allowLead: true }), requireCommissionLead, controller.deleteQuestion);

module.exports = router;
