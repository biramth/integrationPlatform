const express = require('express');
const rateLimit = require('express-rate-limit');
const platformController = require('../controllers/platformController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireRole('it'));

// Rate limiting sur le reset plateforme : 3 tentatives / 15 min par IP.
// Opération destructive — même un IT ne doit pas pouvoir la déclencher en rafale.
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de réinitialisation. Réessayez plus tard.' },
});

router.post('/reset', resetLimiter, platformController.resetPlatform);

router.get('/storage-status', platformController.getStorageStatus);
router.post('/migrate-storage-to-r2', platformController.migrateStorageToR2);

module.exports = router;
