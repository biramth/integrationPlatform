const db = require('../db/database');
const auditService = require('../services/auditService');

async function listCriteria(req, res) {
  const criteria = await db.all('SELECT * FROM aptitude_criteria ORDER BY label ASC');
  res.json({ criteria });
}

async function createCriterion(req, res) {
  const { label } = req.body;
  if (!label) {
    return res.status(400).json({ error: 'label requis.' });
  }

  try {
    const result = await db.run('INSERT INTO aptitude_criteria (label) VALUES ($1) RETURNING id', [label]);
    const criterion = await db.get('SELECT * FROM aptitude_criteria WHERE id = $1', [result.rows[0].id]);

    await auditService.logAction(req, {
      action: 'aptitude_criterion.create',
      resourceType: 'aptitude_criterion',
      resourceId: criterion.id,
      resourceLabel: criterion.label,
      commission: 'sante',
      after: criterion,
    });

    res.status(201).json({ criterion });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ce critère existe déjà.' });
    }
    throw err;
  }
}

async function updateCriterion(req, res) {
  const { id } = req.params;
  const { label } = req.body;
  if (!label) {
    return res.status(400).json({ error: 'label requis.' });
  }

  const existing = await db.get('SELECT * FROM aptitude_criteria WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Critère introuvable.' });
  }

  await db.run('UPDATE aptitude_criteria SET label = $1 WHERE id = $2', [label, id]);
  const criterion = await db.get('SELECT * FROM aptitude_criteria WHERE id = $1', [id]);

  await auditService.logAction(req, {
    action: 'aptitude_criterion.update',
    resourceType: 'aptitude_criterion',
    resourceId: id,
    resourceLabel: criterion.label,
    commission: 'sante',
    before: existing,
    after: criterion,
  });

  res.json({ criterion });
}

async function deleteCriterion(req, res) {
  const { id } = req.params;
  const usedByActivity = await db.get('SELECT COUNT(*) AS n FROM activity_required_criteria WHERE criterion_id = $1', [id]);
  const usedByRestriction = await db.get('SELECT COUNT(*) AS n FROM health_restrictions WHERE criterion_id = $1', [id]);
  const usedByDut1 = await db.get('SELECT COUNT(*) AS n FROM dut1_unmet_criteria WHERE criterion_id = $1', [id]);

  if (Number(usedByActivity.n) > 0 || Number(usedByRestriction.n) > 0 || Number(usedByDut1.n) > 0) {
    return res.status(409).json({ error: 'Ce critère est utilisé et ne peut pas être supprimé.' });
  }

  const existing = await db.get('SELECT * FROM aptitude_criteria WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Critère introuvable.' });
  }

  await db.run('DELETE FROM aptitude_criteria WHERE id = $1', [id]);

  await auditService.logAction(req, {
    action: 'aptitude_criterion.delete',
    resourceType: 'aptitude_criterion',
    resourceId: id,
    resourceLabel: existing.label,
    commission: 'sante',
    before: existing,
  });

  res.status(204).send();
}

// Toutes les activités (créées par Présidentielle) avec les critères déjà
// exigés pour chacune — pour la page de configuration du chef Santé.
async function listActivitiesWithCriteria(req, res) {
  const activities = await db.all(
    `SELECT a.id, a.name, a.activity_date, a.end_date,
       COALESCE(array_agg(arc.criterion_id) FILTER (WHERE arc.criterion_id IS NOT NULL), '{}') AS criterion_ids
     FROM activities a
     LEFT JOIN activity_required_criteria arc ON arc.activity_id = a.id
     GROUP BY a.id
     ORDER BY a.activity_date ASC, a.name ASC`
  );
  res.json({ activities });
}

// Remplace l'ensemble des critères exigés pour une activité (pas un ajout
// incrémental) : plus simple à raisonner côté frontend, qui envoie toujours
// la liste complète cochée.
async function setActivityCriteria(req, res) {
  const { id } = req.params;
  const { criterionIds } = req.body;

  const activity = await db.get('SELECT * FROM activities WHERE id = $1', [id]);
  if (!activity) {
    return res.status(404).json({ error: 'Activité introuvable.' });
  }
  if (!Array.isArray(criterionIds)) {
    return res.status(400).json({ error: 'criterionIds doit être un tableau.' });
  }

  await db.transaction(async (tx) => {
    await tx.run('DELETE FROM activity_required_criteria WHERE activity_id = $1', [id]);
    for (const criterionId of criterionIds) {
      await tx.run(
        'INSERT INTO activity_required_criteria (activity_id, criterion_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, criterionId]
      );
    }
  });

  await auditService.logAction(req, {
    action: 'activity.set_required_criteria',
    resourceType: 'activity',
    resourceId: id,
    resourceLabel: activity.name,
    commission: 'sante',
    after: { criterionIds },
  });

  res.json({ activityId: Number(id), criterionIds });
}

module.exports = {
  listCriteria,
  createCriterion,
  updateCriterion,
  deleteCriterion,
  listActivitiesWithCriteria,
  setActivityCriteria,
};
