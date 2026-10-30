const express = require('express');
const importController = require('../controllers/importController');
const { verifyToken, requireRole, requireRoleStrict, requireCommissionLeadStrict } = require('../middleware/auth');
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

// L'import de chambres est un travail de mise en place réservé au chef de la
// commission Orga — pas à n'importe quel agent Orga (le sous-domaine
// "logistique" ne configure plus les chambres, cf. roomRoutes.js), et pas à IT
// même via son bypass superutilisateur habituel.
router.post(
  '/rooms/preview',
  requireRoleStrict('orga'),
  requireCommissionLeadStrict,
  uploadSpreadsheet.single('file'),
  importController.previewRooms
);
router.post('/rooms/confirm', requireRoleStrict('orga'), requireCommissionLeadStrict, importController.confirmRooms);

// Nouvel import : CSV "Vos coordonnées" — DUT1 + contacts d'urgence
router.post(
  '/contacts-csv/preview',
  requireRole('it'),
  uploadSpreadsheet.single('file'),
  importController.previewContactsCsv
);
router.post('/contacts-csv/confirm', requireRole('it'), importController.confirmContactsCsv);

module.exports = router;
