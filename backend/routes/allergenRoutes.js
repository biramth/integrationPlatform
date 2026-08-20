const express = require('express');
const allergenController = require('../controllers/allergenController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/', allergenController.listAllergens);
router.post('/', requireRole('sante'), allergenController.createAllergen);
router.put('/:id', requireRole('sante'), allergenController.updateAllergen);
router.delete('/:id', requireRole('sante'), allergenController.deleteAllergen);

module.exports = router;
