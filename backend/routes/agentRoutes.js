const express = require('express');
const agentController = require('../controllers/agentController');
const { verifyToken, requireRole, requireAgentManagement } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireAgentManagement);

router.get('/', agentController.listAgents);
router.post('/', agentController.createAgent);
router.put('/:id', agentController.updateAgent);
router.put('/:id/password', agentController.resetPassword);
router.delete('/:id', agentController.deactivateAgent);
router.delete('/:id/permanent', requireRole('it'), agentController.hardDeleteAgent);

module.exports = router;
