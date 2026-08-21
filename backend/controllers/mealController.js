const db = require('../db/database');
const auditService = require('../services/auditService');

const MEAL_TYPES = ['petit-dejeuner', 'dejeuner', 'diner'];

const DISH_ALLERGENS_SUBQUERY = `(
  SELECT COALESCE(json_agg(json_build_object('id', a.id, 'label', a.label)), '[]'::json)
  FROM dish_allergens dga JOIN allergens a ON a.id = dga.allergen_id
  WHERE dga.dish_id = dish.id
) AS dish_allergens_json`;

function serializeMealService(row, dishRows) {
  const dishes = dishRows
    .filter((d) => d.meal_service_id === row.id)
    .map((d) => ({
      id: d.dish_id,
      name: d.dish_name,
      allergens: d.dish_allergens_json || [],
    }));
  return { id: row.id, serviceDate: row.service_date, mealType: row.meal_type, dishes };
}

async function listMealServices(req, res) {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'date requise (YYYY-MM-DD).' });
  }

  const services = await db.all('SELECT * FROM meal_services WHERE service_date = $1 ORDER BY meal_type', [date]);

  const dishRows = await db.all(
    `SELECT dish.id AS dish_id, dish.name AS dish_name, dish.meal_service_id,
       ${DISH_ALLERGENS_SUBQUERY}
     FROM dishes dish
     WHERE dish.meal_service_id IN (SELECT id FROM meal_services WHERE service_date = $1)`,
    [date]
  );

  res.json({ mealServices: services.map((s) => serializeMealService(s, dishRows)) });
}

async function createMealService(req, res) {
  const { serviceDate, mealType } = req.body;
  if (!serviceDate || !mealType) {
    return res.status(400).json({ error: 'serviceDate et mealType sont requis.' });
  }
  if (!MEAL_TYPES.includes(mealType)) {
    return res.status(400).json({ error: `mealType doit être l'un de : ${MEAL_TYPES.join(', ')}.` });
  }

  const result = await db.run(
    'INSERT INTO meal_services (service_date, meal_type, created_by) VALUES ($1, $2, $3) ON CONFLICT (service_date, meal_type) DO NOTHING',
    [serviceDate, mealType, req.user.id]
  );

  const service = await db.get(
    'SELECT * FROM meal_services WHERE service_date = $1 AND meal_type = $2',
    [serviceDate, mealType]
  );

  // ON CONFLICT DO NOTHING peut être un no-op (le service existait déjà) :
  // pas de ligne d'audit dans ce cas, ce n'est pas une création.
  if (result.changes > 0) {
    await auditService.logAction(req, {
      action: 'meal_service.create',
      resourceType: 'meal_service',
      resourceId: service.id,
      resourceLabel: `${service.service_date} — ${service.meal_type}`,
      commission: 'cuisine',
      after: service,
    });
  }

  res.status(201).json({ mealService: serializeMealService(service, []) });
}

async function createDish(req, res) {
  const { id } = req.params;
  const { name, allergenIds } = req.body;

  const service = await db.get('SELECT * FROM meal_services WHERE id = $1', [id]);
  if (!service) {
    return res.status(404).json({ error: 'Service de repas introuvable.' });
  }
  if (!name) {
    return res.status(400).json({ error: 'name requis.' });
  }

  const dishId = await db.transaction(async (tx) => {
    const result = await tx.run(
      'INSERT INTO dishes (meal_service_id, name, created_by) VALUES ($1, $2, $3) RETURNING id',
      [id, name, req.user.id]
    );
    const newDishId = result.rows[0].id;

    const ids = Array.isArray(allergenIds) ? allergenIds.map(Number) : [];
    for (const allergenId of ids) {
      await tx.run('INSERT INTO dish_allergens (dish_id, allergen_id) VALUES ($1, $2)', [newDishId, allergenId]);
    }
    return newDishId;
  });

  const dishRow = await db.get(
    `SELECT dish.id AS dish_id, dish.name AS dish_name, dish.meal_service_id,
       ${DISH_ALLERGENS_SUBQUERY}
     FROM dishes dish WHERE dish.id = $1`,
    [dishId]
  );

  await auditService.logAction(req, {
    action: 'dish.create',
    resourceType: 'dish',
    resourceId: dishId,
    resourceLabel: dishRow.dish_name,
    commission: 'cuisine',
    after: { name: dishRow.dish_name, mealServiceId: dishRow.meal_service_id, allergens: dishRow.dish_allergens_json },
  });

  res.status(201).json({
    dish: { id: dishRow.dish_id, name: dishRow.dish_name, allergens: dishRow.dish_allergens_json || [] },
  });
}

async function deleteDish(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM dishes WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Plat introuvable.' });
  }

  await db.run('DELETE FROM dishes WHERE id = $1', [id]);

  await auditService.logAction(req, {
    action: 'dish.delete',
    resourceType: 'dish',
    resourceId: id,
    resourceLabel: existing.name,
    commission: 'cuisine',
    before: existing,
  });

  res.status(204).send();
}

module.exports = { listMealServices, createMealService, createDish, deleteDish, MEAL_TYPES };
