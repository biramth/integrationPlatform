const express = require('express');
const auditController = require('../controllers/auditController');
const { verifyToken, requireCommissionLead } = require('../middleware/auth');

const router = express.Router();

// Réutilise le gate existant "it OU chef de commission" : un simple agent n'a
// pas accès au journal, même filtré sur sa propre commission.
router.use(verifyToken, requireCommissionLead);

router.get('/', auditController.listAuditLogs);
router.get('/:id', auditController.getAuditLog);

module.exports = router;
