const express = require('express');
const allergenController = require('../controllers/allergenController');
const { verifyToken, requireRole, requireSanteScope, requireSanteScopeAny } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/', allergenController.listAllergens);
router.post('/', requireRole('sante'), requireSanteScopeAny('suivi', 'phase2'), allergenController.createAllergen);
router.put('/:id', requireRole('sante'), requireSanteScope('suivi', { allowLead: true }), allergenController.updateAllergen);
router.delete('/:id', requireRole('sante'), requireSanteScope('suivi', { allowLead: true }), allergenController.deleteAllergen);

module.exports = router;
