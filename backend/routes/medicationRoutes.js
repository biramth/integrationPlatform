const express = require('express');
const medicationController = require('../controllers/medicationController');
const { verifyToken, requireRole, requireSanteScope } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Lecture de la liste des médicaments : accessible à tous les agents Santé et IT
// (utilisée par le formulaire des traitements et la vue d'ensemble).
router.get('/', requireRole('sante', 'it'), medicationController.listMedications);

router.use(requireRole('sante', 'it'), requireSanteScope('medoc', { allowLead: true }));

router.post('/', medicationController.createMedication);
router.put('/:id', medicationController.updateMedication);
router.delete('/:id', medicationController.deleteMedication);
router.post('/:id/movements', medicationController.recordMovement);
router.get('/:id/movements', medicationController.listMovements);

module.exports = router;
