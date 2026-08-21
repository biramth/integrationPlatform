const express = require('express');
const allergenController = require('../controllers/allergenController');
const { verifyToken, requireRole, requireSanteScope } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/', allergenController.listAllergens);
router.post('/', requireRole('sante'), requireSanteScope('suivi'), allergenController.createAllergen);
router.put('/:id', requireRole('sante'), requireSanteScope('suivi'), allergenController.updateAllergen);
router.delete('/:id', requireRole('sante'), requireSanteScope('suivi'), allergenController.deleteAllergen);

module.exports = router;
