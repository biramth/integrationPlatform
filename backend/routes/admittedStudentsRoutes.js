const express = require('express');
const controller = require('../controllers/admittedStudentsController');
const { verifyToken, requireRole, requireOrgaScope } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireRole('orga'), requireOrgaScope('enregistrement'));

router.get('/', controller.search);
router.get('/match', controller.match);
router.get('/progress', controller.progress);

module.exports = router;
