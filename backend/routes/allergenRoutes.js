const express = require('express');
const allergenController = require('../controllers/allergenController');
const { verifyToken, requireRole, requireSanteScope, requireSanteScopeAny } = require('../middleware/auth');
const { cached } = require('../middleware/cache');

const router = express.Router();

router.use(verifyToken);

// Liste de référence, lue par tous les formulaires : 60 s de cache suffisent,
// et toute création/renommage/suppression la vide via auditService.
router.get('/', cached(60_000), allergenController.listAllergens);
router.post('/', requireRole('sante'), requireSanteScopeAny('suivi', 'phase2'), allergenController.createAllergen);
router.put('/:id', requireRole('sante'), requireSanteScope('suivi', { allowLead: true }), allergenController.updateAllergen);
router.delete('/:id', requireRole('sante'), requireSanteScope('suivi', { allowLead: true }), allergenController.deleteAllergen);

module.exports = router;
