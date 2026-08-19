const db = require('../db/database');

async function listAllergens(req, res) {
  const allergens = await db.all('SELECT * FROM allergens ORDER BY label ASC');
  res.json({ allergens });
}

async function createAllergen(req, res) {
  const { label } = req.body;
  if (!label) {
    return res.status(400).json({ error: 'label requis.' });
  }

  try {
    const result = await db.run('INSERT INTO allergens (label) VALUES ($1) RETURNING id', [label]);
    const allergen = await db.get('SELECT * FROM allergens WHERE id = $1', [result.rows[0].id]);
    res.status(201).json({ allergen });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Cet allergène existe déjà.' });
    }
    throw err;
  }
}

async function updateAllergen(req, res) {
  const { id } = req.params;
  const { label } = req.body;
  if (!label) {
    return res.status(400).json({ error: 'label requis.' });
  }

  const result = await db.run('UPDATE allergens SET label = $1 WHERE id = $2', [label, id]);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Allergène introuvable.' });
  }

  res.json({ allergen: await db.get('SELECT * FROM allergens WHERE id = $1', [id]) });
}

async function deleteAllergen(req, res) {
  const { id } = req.params;
  const usedByDut1 = await db.get('SELECT COUNT(*) AS n FROM dut1_allergens WHERE allergen_id = $1', [id]);
  const usedByDish = await db.get('SELECT COUNT(*) AS n FROM dish_allergens WHERE allergen_id = $1', [id]);

  if (Number(usedByDut1.n) > 0 || Number(usedByDish.n) > 0) {
    return res.status(409).json({ error: 'Cet allergène est utilisé et ne peut pas être supprimé.' });
  }

  const result = await db.run('DELETE FROM allergens WHERE id = $1', [id]);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Allergène introuvable.' });
  }

  res.status(204).send();
}

module.exports = { listAllergens, createAllergen, updateAllergen, deleteAllergen };
