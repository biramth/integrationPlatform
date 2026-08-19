const express = require('express');
const controller = require('../controllers/admittedStudentsController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireRole('registrar', 'admin'));

router.get('/', controller.search);
router.get('/match', controller.match);
router.get('/progress', controller.progress);

module.exports = router;
