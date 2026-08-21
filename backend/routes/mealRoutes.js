const express = require('express');
const mealController = require('../controllers/mealController');
const { verifyToken, requireRole, requireCommissionLead } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Tout membre de la commission Cuisine (et Santé, pour repérer les allergènes)
// voit le menu du jour, mais seul le chef de la commission Cuisine le crée ou
// le modifie.
router.get('/meal-services', requireRole('cuisine', 'sante'), mealController.listMealServices);
router.post('/meal-services', requireRole('cuisine'), requireCommissionLead, mealController.createMealService);
router.post(
  '/meal-services/:id/dishes',
  requireRole('cuisine'),
  requireCommissionLead,
  mealController.createDish
);
router.delete('/dishes/:id', requireRole('cuisine'), requireCommissionLead, mealController.deleteDish);

module.exports = router;
