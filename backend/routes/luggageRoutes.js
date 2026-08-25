const express = require('express');
const luggageController = require('../controllers/luggageController');
const { verifyToken, requireRole, requireOrgaScope } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { requireFeatureEnabled } = require('../middleware/platformSettings');

const router = express.Router();

router.use(verifyToken);

// Comme l'enregistrement, la photo/comptage des bagages n'a d'utilité que le
// premier jour : IT peut la désactiver une fois la saisie terminée (cf.
// requireFeatureEnabled — refuse même IT). La lecture (listItems, photo,
// suppression) reste possible pour consulter/corriger un dossier existant.
router.put(
  '/dut1/:id/luggage-count',
  requireRole('orga'),
  requireOrgaScope('bagages'),
  requireFeatureEnabled('luggage'),
  luggageController.setLuggageCount
);
router.post(
  '/dut1/:id/luggage-items',
  requireRole('orga'),
  requireOrgaScope('bagages'),
  requireFeatureEnabled('luggage'),
  upload.single('photo'),
  luggageController.createLuggageItem
);
router.get('/dut1/:id/luggage-items', requireRole('orga', 'sante', 'it'), luggageController.listLuggageItems);
router.get(
  '/luggage-items/mine',
  requireRole('orga'),
  requireOrgaScope('bagages'),
  luggageController.listMyLuggageItems
);
router.get('/luggage-items/:itemId/photo', requireRole('orga', 'sante', 'it'), luggageController.getLuggagePhotoUrl);
router.delete(
  '/luggage-items/:itemId',
  requireRole('orga'),
  requireOrgaScope('bagages'),
  luggageController.deleteLuggageItem
);

module.exports = router;
