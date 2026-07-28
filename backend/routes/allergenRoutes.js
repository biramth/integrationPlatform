const express = require('express');
const allergenController = require('../controllers/allergenController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/', allergenController.listAllergens);
router.post('/', requireRole('sante', 'admin'), allergenController.createAllergen);
router.put('/:id', requireRole('sante', 'admin'), allergenController.updateAllergen);
router.delete('/:id', requireRole('sante', 'admin'), allergenController.deleteAllergen);

module.exports = router;
