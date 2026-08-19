const express = require('express');
const activityController = require('../controllers/activityController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/', requireRole('sante', 'admin'), activityController.listActivities);
router.post('/', requireRole('admin'), activityController.createActivity);
router.put('/:id', requireRole('admin'), activityController.updateActivity);
router.delete('/:id', requireRole('admin'), activityController.deleteActivity);

module.exports = router;
