const db = require('../db/database');

const MEAL_TYPES = ['petit-dejeuner', 'dejeuner', 'diner'];

function serializeMealService(row, dishRows) {
  const dishes = dishRows
    .filter((d) => d.meal_service_id === row.id)
    .map((d) => ({
      id: d.dish_id,
      name: d.dish_name,
      allergens: d.dish_allergens_json ? JSON.parse(d.dish_allergens_json) : [],
    }));
  return { id: row.id, serviceDate: row.service_date, mealType: row.meal_type, dishes };
}

function listMealServices(req, res) {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'date requise (YYYY-MM-DD).' });
  }

  const services = db
    .prepare('SELECT * FROM meal_services WHERE service_date = ? ORDER BY meal_type')
    .all(date);

  const dishRows = db
    .prepare(
      `SELECT dish.id AS dish_id, dish.name AS dish_name, dish.meal_service_id,
         (SELECT COALESCE(json_group_array(json_object('id', a.id, 'label', a.label)), '[]')
          FROM dish_allergens dga JOIN allergens a ON a.id = dga.allergen_id
          WHERE dga.dish_id = dish.id) AS dish_allergens_json
       FROM dishes dish
       WHERE dish.meal_service_id IN (SELECT id FROM meal_services WHERE service_date = ?)`
    )
    .all(date);

  res.json({ mealServices: services.map((s) => serializeMealService(s, dishRows)) });
}

function createMealService(req, res) {
  const { serviceDate, mealType } = req.body;
  if (!serviceDate || !mealType) {
    return res.status(400).json({ error: 'serviceDate et mealType sont requis.' });
  }
  if (!MEAL_TYPES.includes(mealType)) {
    return res.status(400).json({ error: `mealType doit être l'un de : ${MEAL_TYPES.join(', ')}.` });
  }

  db.prepare(
    'INSERT OR IGNORE INTO meal_services (service_date, meal_type, created_by) VALUES (?, ?, ?)'
  ).run(serviceDate, mealType, req.user.id);

  const service = db
    .prepare('SELECT * FROM meal_services WHERE service_date = ? AND meal_type = ?')
    .get(serviceDate, mealType);

  res.status(201).json({ mealService: serializeMealService(service, []) });
}

function createDish(req, res) {
  const { id } = req.params;
  const { name, allergenIds } = req.body;

  const service = db.prepare('SELECT * FROM meal_services WHERE id = ?').get(id);
  if (!service) {
    return res.status(404).json({ error: 'Service de repas introuvable.' });
  }
  if (!name) {
    return res.status(400).json({ error: 'name requis.' });
  }

  const insertDish = db.transaction(() => {
    const result = db
      .prepare('INSERT INTO dishes (meal_service_id, name, created_by) VALUES (?, ?, ?)')
      .run(id, name, req.user.id);
    const dishId = result.lastInsertRowid;

    const ids = Array.isArray(allergenIds) ? allergenIds.map(Number) : [];
    const insertAllergen = db.prepare('INSERT INTO dish_allergens (dish_id, allergen_id) VALUES (?, ?)');
    for (const allergenId of ids) {
      insertAllergen.run(dishId, allergenId);
    }
    return dishId;
  });

  const dishId = insertDish();

  const dishRow = db
    .prepare(
      `SELECT dish.id AS dish_id, dish.name AS dish_name, dish.meal_service_id,
         (SELECT COALESCE(json_group_array(json_object('id', a.id, 'label', a.label)), '[]')
          FROM dish_allergens dga JOIN allergens a ON a.id = dga.allergen_id
          WHERE dga.dish_id = dish.id) AS dish_allergens_json
       FROM dishes dish WHERE dish.id = ?`
    )
    .get(dishId);

  res.status(201).json({
    dish: { id: dishRow.dish_id, name: dishRow.dish_name, allergens: JSON.parse(dishRow.dish_allergens_json) },
  });
}

function deleteDish(req, res) {
  const result = db.prepare('DELETE FROM dishes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Plat introuvable.' });
  }
  res.status(204).send();
}

module.exports = { listMealServices, createMealService, createDish, deleteDish, MEAL_TYPES };
