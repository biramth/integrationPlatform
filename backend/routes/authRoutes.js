const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Protection contre le bruteforce : 10 tentatives / 15 min par IP, uniquement
// comptées sur les échecs (une connexion réussie ne consomme pas le quota).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Trop de tentatives de connexion. Réessaie dans quelques minutes.' },
});

router.post('/login', loginLimiter, authController.login);
router.get('/me', verifyToken, authController.me);

module.exports = router;
