const db = require('../db/database');
const auditService = require('../services/auditService');

async function listAllergens(req, res) {
  const allergens = await db.all(
    `SELECT a.*,
       (SELECT COUNT(*) FROM dut1_allergens da WHERE da.allergen_id = a.id) AS dut1_count,
       (SELECT COUNT(*) FROM dish_allergens dga WHERE dga.allergen_id = a.id) AS dish_count
     FROM allergens a
     ORDER BY a.label ASC`
  );
  res.json({ allergens: allergens.map((a) => ({ ...a, dut1_count: Number(a.dut1_count), dish_count: Number(a.dish_count) })) });
}

async function createAllergen(req, res) {
  const { label } = req.body;
  if (!label) {
    return res.status(400).json({ error: 'label requis.' });
  }

  try {
    const result = await db.run('INSERT INTO allergens (label) VALUES ($1) RETURNING id', [label]);
    const allergen = await db.get('SELECT * FROM allergens WHERE id = $1', [result.rows[0].id]);

    await auditService.logAction(req, {
      action: 'allergen.create',
      resourceType: 'allergen',
      resourceId: allergen.id,
      resourceLabel: allergen.label,
      commission: 'sante',
      after: allergen,
    });

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

  const existing = await db.get('SELECT * FROM allergens WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Allergène introuvable.' });
  }

  await db.run('UPDATE allergens SET label = $1 WHERE id = $2', [label, id]);
  const allergen = await db.get('SELECT * FROM allergens WHERE id = $1', [id]);

  await auditService.logAction(req, {
    action: 'allergen.update',
    resourceType: 'allergen',
    resourceId: id,
    resourceLabel: allergen.label,
    commission: 'sante',
    before: existing,
    after: allergen,
  });

  res.json({ allergen });
}

async function deleteAllergen(req, res) {
  const { id } = req.params;
  const usedByDut1 = await db.get('SELECT COUNT(*) AS n FROM dut1_allergens WHERE allergen_id = $1', [id]);
  const usedByDish = await db.get('SELECT COUNT(*) AS n FROM dish_allergens WHERE allergen_id = $1', [id]);

  if (Number(usedByDut1.n) > 0 || Number(usedByDish.n) > 0) {
    return res.status(409).json({ error: 'Cet allergène est utilisé et ne peut pas être supprimé.' });
  }

  const existing = await db.get('SELECT * FROM allergens WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Allergène introuvable.' });
  }

  await db.run('DELETE FROM allergens WHERE id = $1', [id]);

  await auditService.logAction(req, {
    action: 'allergen.delete',
    resourceType: 'allergen',
    resourceId: id,
    resourceLabel: existing.label,
    commission: 'sante',
    before: existing,
  });

  res.status(204).send();
}

module.exports = { listAllergens, createAllergen, updateAllergen, deleteAllergen };
