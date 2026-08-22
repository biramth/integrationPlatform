const express = require('express');
const medicationController = require('../controllers/medicationController');
const { verifyToken, requireRole, requireSanteScope } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Le chef de commission ne gère pas le stock lui-même (le responsable désigné
// du sous-rôle "medoc" s'en charge au quotidien) — il garde seulement un accès
// en lecture pour son tableau de bord, d'où allowLead sur cette seule route.
router.get('/', requireRole('sante'), requireSanteScope('medoc', { allowLead: true }), medicationController.listMedications);

router.use(requireRole('sante'), requireSanteScope('medoc'));

router.post('/', medicationController.createMedication);
router.put('/:id', medicationController.updateMedication);
router.delete('/:id', medicationController.deleteMedication);
router.post('/:id/movements', medicationController.recordMovement);
router.get('/:id/movements', medicationController.listMovements);

module.exports = router;
