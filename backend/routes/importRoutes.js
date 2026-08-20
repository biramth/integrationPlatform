const express = require('express');
const importController = require('../controllers/importController');
const { verifyToken, requireRole, requireOrgaScope } = require('../middleware/auth');
const { uploadSpreadsheet } = require('../middleware/uploadSpreadsheet');

const router = express.Router();

router.use(verifyToken);

router.post(
  '/admitted-students/preview',
  requireRole('it'),
  uploadSpreadsheet.single('file'),
  importController.previewAdmittedStudents
);
router.post('/admitted-students/confirm', requireRole('it'), importController.confirmAdmittedStudents);

// L'import de chambres relève de la commission Orga (sous-domaine chambres),
// pas seulement d'IT.
router.post(
  '/rooms/preview',
  requireRole('orga'),
  requireOrgaScope('chambres'),
  uploadSpreadsheet.single('file'),
  importController.previewRooms
);
router.post('/rooms/confirm', requireRole('orga'), requireOrgaScope('chambres'), importController.confirmRooms);

module.exports = router;
