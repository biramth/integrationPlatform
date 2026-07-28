const db = require('../db/database');

function listAllergens(req, res) {
  const allergens = db.prepare('SELECT * FROM allergens ORDER BY label ASC').all();
  res.json({ allergens });
}

function createAllergen(req, res) {
  const { label } = req.body;
  if (!label) {
    return res.status(400).json({ error: 'label requis.' });
  }

  try {
    const result = db.prepare('INSERT INTO allergens (label) VALUES (?)').run(label);
    const allergen = db.prepare('SELECT * FROM allergens WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ allergen });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Cet allergène existe déjà.' });
    }
    throw err;
  }
}

function updateAllergen(req, res) {
  const { id } = req.params;
  const { label } = req.body;
  if (!label) {
    return res.status(400).json({ error: 'label requis.' });
  }

  const result = db.prepare('UPDATE allergens SET label = ? WHERE id = ?').run(label, id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Allergène introuvable.' });
  }

  res.json({ allergen: db.prepare('SELECT * FROM allergens WHERE id = ?').get(id) });
}

function deleteAllergen(req, res) {
  const { id } = req.params;
  const usedByDut1 = db.prepare('SELECT COUNT(*) AS n FROM dut1_allergens WHERE allergen_id = ?').get(id).n;
  const usedByDish = db.prepare('SELECT COUNT(*) AS n FROM dish_allergens WHERE allergen_id = ?').get(id).n;

  if (usedByDut1 > 0 || usedByDish > 0) {
    return res.status(409).json({ error: 'Cet allergène est utilisé et ne peut pas être supprimé.' });
  }

  const result = db.prepare('DELETE FROM allergens WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Allergène introuvable.' });
  }

  res.status(204).send();
}

module.exports = { listAllergens, createAllergen, updateAllergen, deleteAllergen };
