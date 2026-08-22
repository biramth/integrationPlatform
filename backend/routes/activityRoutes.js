const express = require('express');
const activityController = require('../controllers/activityController');
const { verifyToken, requireRoleStrict } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Le planning est un simple calendrier d'activités, sans donnée sensible :
// accessible en lecture à toutes les commissions, pas seulement à celles qui
// l'utilisent explicitement dans leur propre page.
router.get('/', activityController.listActivities);
// Fixer le programme est le ressort exclusif de la commission Présidentielle
// — pas d'IT, même via son bypass superutilisateur habituel (requireRoleStrict).
router.post('/', requireRoleStrict('presidentielle'), activityController.createActivity);
router.put('/:id', requireRoleStrict('presidentielle'), activityController.updateActivity);
router.delete('/:id', requireRoleStrict('presidentielle'), activityController.deleteActivity);

module.exports = router;
