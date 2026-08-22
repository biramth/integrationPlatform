const db = require('../db/database');
const auditService = require('../services/auditService');

const LEVELS_SUBQUERY = `(
  SELECT COALESCE(json_agg(json_build_object('id', l.id, 'label', l.label, 'rank', l.rank) ORDER BY l.rank ASC), '[]'::json)
  FROM aptitude_criterion_levels l
  WHERE l.criterion_id = c.id
) AS levels`;

async function listCriteria(req, res) {
  const criteria = await db.all(`SELECT c.*, ${LEVELS_SUBQUERY} FROM aptitude_criteria c ORDER BY c.label ASC`);
  res.json({ criteria });
}

async function createCriterion(req, res) {
  const { label } = req.body;
  if (!label) {
    return res.status(400).json({ error: 'label requis.' });
  }

  try {
    const result = await db.run('INSERT INTO aptitude_criteria (label) VALUES ($1) RETURNING id', [label]);
    const criterion = await db.get(`SELECT c.*, ${LEVELS_SUBQUERY} FROM aptitude_criteria c WHERE c.id = $1`, [
      result.rows[0].id,
    ]);

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
  const criterion = await db.get(`SELECT c.*, ${LEVELS_SUBQUERY} FROM aptitude_criteria c WHERE c.id = $1`, [id]);

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
  const usedByDut1 = await db.get('SELECT COUNT(*) AS n FROM dut1_aptitude_levels WHERE criterion_id = $1', [id]);

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

// Ajoute un niveau à la fin de l'échelle du critère (rang = max + 1) — le
// chef en configure autant qu'il veut, dans l'ordre où il les crée ; il peut
// les réordonner ensuite (cf. reorderLevels).
async function createLevel(req, res) {
  const { id } = req.params;
  const { label } = req.body;
  if (!label) {
    return res.status(400).json({ error: 'label requis.' });
  }

  const criterion = await db.get('SELECT * FROM aptitude_criteria WHERE id = $1', [id]);
  if (!criterion) {
    return res.status(404).json({ error: 'Critère introuvable.' });
  }

  const rankRow = await db.get('SELECT COALESCE(MAX(rank), -1) + 1 AS next FROM aptitude_criterion_levels WHERE criterion_id = $1', [id]);
  const result = await db.run(
    'INSERT INTO aptitude_criterion_levels (criterion_id, label, rank) VALUES ($1, $2, $3) RETURNING id',
    [id, label, Number(rankRow.next)]
  );

  await auditService.logAction(req, {
    action: 'aptitude_criterion.add_level',
    resourceType: 'aptitude_criterion',
    resourceId: id,
    resourceLabel: `${criterion.label} — ${label}`,
    commission: 'sante',
    after: { levelId: result.rows[0].id, label },
  });

  const updated = await db.get(`SELECT c.*, ${LEVELS_SUBQUERY} FROM aptitude_criteria c WHERE c.id = $1`, [id]);
  res.status(201).json({ criterion: updated });
}

async function updateLevel(req, res) {
  const { id, levelId } = req.params;
  const { label } = req.body;
  if (!label) {
    return res.status(400).json({ error: 'label requis.' });
  }

  const existing = await db.get('SELECT * FROM aptitude_criterion_levels WHERE id = $1 AND criterion_id = $2', [levelId, id]);
  if (!existing) {
    return res.status(404).json({ error: 'Niveau introuvable.' });
  }

  await db.run('UPDATE aptitude_criterion_levels SET label = $1 WHERE id = $2', [label, levelId]);

  await auditService.logAction(req, {
    action: 'aptitude_criterion.update_level',
    resourceType: 'aptitude_criterion',
    resourceId: id,
    resourceLabel: label,
    commission: 'sante',
    before: existing,
  });

  const updated = await db.get(`SELECT c.*, ${LEVELS_SUBQUERY} FROM aptitude_criteria c WHERE c.id = $1`, [id]);
  res.json({ criterion: updated });
}

async function deleteLevel(req, res) {
  const { id, levelId } = req.params;
  const existing = await db.get('SELECT * FROM aptitude_criterion_levels WHERE id = $1 AND criterion_id = $2', [levelId, id]);
  if (!existing) {
    return res.status(404).json({ error: 'Niveau introuvable.' });
  }

  const usedByDut1 = await db.get('SELECT COUNT(*) AS n FROM dut1_aptitude_levels WHERE level_id = $1', [levelId]);
  const usedByActivity = await db.get('SELECT COUNT(*) AS n FROM activity_required_criteria WHERE min_level_id = $1', [levelId]);
  if (Number(usedByDut1.n) > 0 || Number(usedByActivity.n) > 0) {
    return res.status(409).json({ error: 'Ce niveau est utilisé et ne peut pas être supprimé.' });
  }

  await db.run('DELETE FROM aptitude_criterion_levels WHERE id = $1', [levelId]);

  await auditService.logAction(req, {
    action: 'aptitude_criterion.delete_level',
    resourceType: 'aptitude_criterion',
    resourceId: id,
    resourceLabel: existing.label,
    commission: 'sante',
    before: existing,
  });

  const updated = await db.get(`SELECT c.*, ${LEVELS_SUBQUERY} FROM aptitude_criteria c WHERE c.id = $1`, [id]);
  res.json({ criterion: updated });
}

// Réordonne l'échelle : orderedLevelIds doit contenir tous les niveaux du
// critère, dans le nouvel ordre (rang 0 = le plus faible).
async function reorderLevels(req, res) {
  const { id } = req.params;
  const { orderedLevelIds } = req.body;
  if (!Array.isArray(orderedLevelIds) || orderedLevelIds.length === 0) {
    return res.status(400).json({ error: 'orderedLevelIds requis.' });
  }

  await db.transaction(async (tx) => {
    // Passage par des rangs négatifs temporaires : une mise à jour directe
    // vers le rang final peut entrer en collision avec UNIQUE(criterion_id,
    // rank) si un autre niveau occupe encore ce rang (ex. déplacer un niveau
    // en position 0 alors qu'un autre y est déjà).
    for (let i = 0; i < orderedLevelIds.length; i += 1) {
      await tx.run('UPDATE aptitude_criterion_levels SET rank = $1 WHERE id = $2 AND criterion_id = $3', [
        -(i + 1),
        orderedLevelIds[i],
        id,
      ]);
    }
    for (let i = 0; i < orderedLevelIds.length; i += 1) {
      await tx.run('UPDATE aptitude_criterion_levels SET rank = $1 WHERE id = $2 AND criterion_id = $3', [
        i,
        orderedLevelIds[i],
        id,
      ]);
    }
  });

  const updated = await db.get(`SELECT c.*, ${LEVELS_SUBQUERY} FROM aptitude_criteria c WHERE c.id = $1`, [id]);
  res.json({ criterion: updated });
}

// Toutes les activités (créées par Présidentielle) avec, pour chacune, les
// critères déjà exigés et leur niveau minimum — pour la page de
// configuration du chef Santé.
async function listActivitiesWithCriteria(req, res) {
  const activities = await db.all(
    `SELECT a.id, a.name, a.activity_date, a.end_date,
       COALESCE(
         (SELECT json_agg(json_build_object(
             'criterionId', arc.criterion_id,
             'minLevelId', arc.min_level_id
           ))
          FROM activity_required_criteria arc WHERE arc.activity_id = a.id),
         '[]'
       ) AS requirements
     FROM activities a
     ORDER BY a.activity_date ASC, a.name ASC`
  );
  res.json({ activities });
}

// Remplace l'ensemble des exigences (critère + niveau minimum) pour une
// activité — pas un ajout incrémental, le frontend envoie toujours la liste
// complète configurée.
async function setActivityCriteria(req, res) {
  const { id } = req.params;
  const { requirements } = req.body;

  const activity = await db.get('SELECT * FROM activities WHERE id = $1', [id]);
  if (!activity) {
    return res.status(404).json({ error: 'Activité introuvable.' });
  }
  if (!Array.isArray(requirements)) {
    return res.status(400).json({ error: 'requirements doit être un tableau.' });
  }
  for (const r of requirements) {
    if (!r.criterionId || !r.minLevelId) {
      return res.status(400).json({ error: 'Chaque exigence doit avoir un criterionId et un minLevelId.' });
    }
  }

  try {
    await db.transaction(async (tx) => {
      await tx.run('DELETE FROM activity_required_criteria WHERE activity_id = $1', [id]);
      for (const r of requirements) {
        await tx.run(
          'INSERT INTO activity_required_criteria (activity_id, criterion_id, min_level_id) VALUES ($1, $2, $3)',
          [id, r.criterionId, r.minLevelId]
        );
      }
    });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Critère ou niveau invalide.' });
    }
    throw err;
  }

  await auditService.logAction(req, {
    action: 'activity.set_required_criteria',
    resourceType: 'activity',
    resourceId: id,
    resourceLabel: activity.name,
    commission: 'sante',
    after: { requirements },
  });

  res.json({ activityId: Number(id), requirements });
}

module.exports = {
  listCriteria,
  createCriterion,
  updateCriterion,
  deleteCriterion,
  createLevel,
  updateLevel,
  deleteLevel,
  reorderLevels,
  listActivitiesWithCriteria,
  setActivityCriteria,
};
