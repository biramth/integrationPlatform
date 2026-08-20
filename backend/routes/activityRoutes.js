const express = require('express');
const activityController = require('../controllers/activityController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get(
  '/',
  requireRole('sante', 'admin', 'communication', 'culturelle', 'activites'),
  activityController.listActivities
);
router.post('/', requireRole('admin', 'activites'), activityController.createActivity);
router.put('/:id', requireRole('admin', 'activites'), activityController.updateActivity);
router.delete('/:id', requireRole('admin', 'activites'), activityController.deleteActivity);

module.exports = router;
