const express = require('express');
const controller = require('../controllers/aptitudeCriteriaController');
const { verifyToken, requireRole, requireCommissionLead } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Lecture ouverte à tout agent Santé : sert notamment au choix du critère
// quand on déclare une restriction (pas réservé au chef, contrairement à
// l'écriture ci-dessous — configurer les critères et leurs activités reste
// une décision du chef de la commission Santé).
router.get('/', requireRole('sante'), controller.listCriteria);
router.get('/activities', requireRole('sante'), requireCommissionLead, controller.listActivitiesWithCriteria);

router.use(requireRole('sante'), requireCommissionLead);

router.post('/', controller.createCriterion);
router.put('/:id', controller.updateCriterion);
router.delete('/:id', controller.deleteCriterion);
router.put('/activities/:id', controller.setActivityCriteria);

module.exports = router;
