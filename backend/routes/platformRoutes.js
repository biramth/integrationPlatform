const express = require('express');
const platformController = require('../controllers/platformController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireRole('it'));

router.post('/reset', platformController.resetPlatform);

module.exports = router;
