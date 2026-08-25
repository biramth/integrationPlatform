const express = require('express');
const rateLimit = require('express-rate-limit');
const agentController = require('../controllers/agentController');
const { verifyToken, requireRole, requireAgentManagement } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireAgentManagement);

// Rate limiting sur le changement de mot de passe : 5 tentatives / 15 min
// par IP, pour empêcher le brute-force sur les comptes d'autres agents.
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de changement de mot de passe. Réessayez plus tard.' },
});

router.get('/', agentController.listAgents);
router.post('/', agentController.createAgent);
router.put('/:id', agentController.updateAgent);
router.put('/:id/password', passwordResetLimiter, agentController.resetPassword);
router.delete('/:id', agentController.deactivateAgent);
router.delete('/:id/permanent', requireRole('it'), agentController.hardDeleteAgent);

module.exports = router;
