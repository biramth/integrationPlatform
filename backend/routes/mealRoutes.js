const express = require('express');
const mealController = require('../controllers/mealController');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/meal-services', requireRole('cuisine', 'sante'), mealController.listMealServices);
router.post('/meal-services', requireRole('cuisine'), mealController.createMealService);
router.post('/meal-services/:id/dishes', requireRole('cuisine'), mealController.createDish);
router.delete('/dishes/:id', requireRole('cuisine'), mealController.deleteDish);

module.exports = router;
