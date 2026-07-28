const express = require('express');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', authController.login);
router.get('/me', verifyToken, authController.me);

module.exports = router;
