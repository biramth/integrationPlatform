const db = require('../db/database');

function getRisks(req, res) {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'date requise (YYYY-MM-DD).' });
  }

  const rows = db
    .prepare(
      `SELECT DISTINCT
         d.id, d.first_name, d.last_name, d.department, d.gender, r.label AS room_label,
         a.id AS allergen_id, a.label AS allergen_label,
         dish.id AS dish_id, dish.name AS dish_name, ms.meal_type AS meal_type
       FROM dut1_records d
       JOIN dut1_allergens da ON da.dut1_id = d.id
       JOIN allergens a ON a.id = da.allergen_id
       JOIN dish_allergens dga ON dga.allergen_id = a.id
       JOIN dishes dish ON dish.id = dga.dish_id
       JOIN meal_services ms ON ms.id = dish.meal_service_id
       LEFT JOIN rooms r ON r.id = d.room_id
       WHERE ms.service_date = ?
       ORDER BY d.last_name, d.first_name`
    )
    .all(date);

  const byDut1 = new Map();
  for (const row of rows) {
    if (!byDut1.has(row.id)) {
      byDut1.set(row.id, {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        department: row.department,
        gender: row.gender,
        roomLabel: row.room_label,
        matches: [],
      });
    }
    byDut1.get(row.id).matches.push({
      allergen: row.allergen_label,
      dish: row.dish_name,
      mealType: row.meal_type,
    });
  }

  res.json({ atRiskDut1: Array.from(byDut1.values()) });
}

function declareIllness(req, res) {
  const { id } = req.params;
  const { illnessDate, note } = req.body;

  if (!illnessDate) {
    return res.status(400).json({ error: 'illnessDate requis.' });
  }

  const dut1 = db.prepare('SELECT id FROM dut1_records WHERE id = ?').get(id);
  if (!dut1) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  const result = db
    .prepare('INSERT INTO illness_records (dut1_id, illness_date, note, declared_by) VALUES (?, ?, ?, ?)')
    .run(id, illnessDate, note || null, req.user.id);

  const record = db.prepare('SELECT * FROM illness_records WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ illnessRecord: record });
}

function listIllnessForDut1(req, res) {
  const records = db
    .prepare('SELECT * FROM illness_records WHERE dut1_id = ? ORDER BY illness_date DESC, id DESC')
    .all(req.params.id);
  res.json({ illnessRecords: records });
}

function listIllnessByDate(req, res) {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'date requise (YYYY-MM-DD).' });
  }

  const records = db
    .prepare(
      `SELECT ir.*, d.first_name, d.last_name, d.department, r.label AS room_label
       FROM illness_records ir
       JOIN dut1_records d ON d.id = ir.dut1_id
       LEFT JOIN rooms r ON r.id = d.room_id
       WHERE ir.illness_date = ?
       ORDER BY d.last_name, d.first_name`
    )
    .all(date);

  res.json({ illnessRecords: records });
}

module.exports = { getRisks, declareIllness, listIllnessForDut1, listIllnessByDate };
