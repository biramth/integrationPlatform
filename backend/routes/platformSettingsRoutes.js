const express = require('express');
const controller = require('../controllers/platformSettingsController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Lecture ouverte à toute commission authentifiée : sert à savoir si
// Enregistrement/Phase 2 doivent apparaître dans son menu, quel que soit son
// rôle — la bascule (PUT) reste réservée à IT.
router.get('/', controller.listSettings);
router.put('/:key', requireRole('it'), controller.updateSetting);

module.exports = router;
