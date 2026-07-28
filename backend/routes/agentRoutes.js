const express = require('express');
const agentController = require('../controllers/agentController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireRole('admin'));

router.get('/', agentController.listAgents);
router.post('/', agentController.createAgent);
router.put('/:id', agentController.updateAgent);
router.put('/:id/password', agentController.resetPassword);
router.delete('/:id', agentController.deactivateAgent);

module.exports = router;
