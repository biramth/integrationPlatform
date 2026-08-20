const express = require('express');
const activityController = require('../controllers/activityController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Le planning est un simple calendrier d'activités, sans donnée sensible :
// accessible en lecture à toutes les commissions, pas seulement à celles qui
// l'utilisent explicitement dans leur propre page.
router.get('/', activityController.listActivities);
router.post('/', requireRole('presidentielle'), activityController.createActivity);
router.put('/:id', requireRole('presidentielle'), activityController.updateActivity);
router.delete('/:id', requireRole('presidentielle'), activityController.deleteActivity);

module.exports = router;
