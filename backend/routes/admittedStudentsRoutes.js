const express = require('express');
const controller = require('../controllers/admittedStudentsController');
const { verifyToken, requireRole, requireOrgaScope } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Recherche manuelle dans la liste des admis : utilisée à l'enregistrement de
// base (phase 1, Orga).
router.get('/', requireRole('orga'), requireOrgaScope('enregistrement'), controller.search);
// Progression de l'import (admis importés vs déjà rattachés à un dossier) :
// affichée dans le panneau d'import, réservé à IT.
router.get('/progress', requireRole('it'), controller.progress);

module.exports = router;
