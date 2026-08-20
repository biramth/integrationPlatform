const express = require('express');
const activityController = require('../controllers/activityController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Le planning est un simple calendrier d'activités, sans donnée sensible :
// accessible en lecture à toutes les commissions, pas seulement à celles qui
// l'utilisent explicitement dans leur propre page.
router.get('/', activityController.listActivities);
router.post('/', requireRole('admin', 'activites'), activityController.createActivity);
router.put('/:id', requireRole('admin', 'activites'), activityController.updateActivity);
router.delete('/:id', requireRole('admin', 'activites'), activityController.deleteActivity);

module.exports = router;
