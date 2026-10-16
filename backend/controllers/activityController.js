const db = require('../db/database');
const auditService = require('../services/auditService');

// importance : 0 = optionnelle (« + »), 1 à 3 = ★ à ★★★. Toute autre valeur
// (absente, texte, hors bornes) est rejetée plutôt que silencieusement corrigée.
function parseImportance(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 3 ? n : null;
}

async function listActivities(req, res) {
  const activities = await db.all(
    'SELECT * FROM activities ORDER BY activity_date ASC, start_time ASC NULLS LAST, name ASC'
  );
  res.json({ activities });
}

async function createActivity(req, res) {
  const { name, activityDate, endDate, startTime, description, timeLabel, highlight } = req.body;
  if (!name || !activityDate) {
    return res.status(400).json({ error: 'name et activityDate sont requis.' });
  }
  const importance = parseImportance(req.body.importance);
  if (importance === null) {
    return res.status(400).json({ error: 'importance doit être un entier entre 0 et 3.' });
  }

  const result = await db.run(
    `INSERT INTO activities
       (name, activity_date, end_date, start_time, description, importance, highlight, time_label, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      name,
      activityDate,
      endDate || null,
      startTime || null,
      description || null,
      importance ?? 2,
      Boolean(highlight),
      timeLabel || null,
      req.user.id,
    ]
  );

  const activity = await db.get('SELECT * FROM activities WHERE id = $1', [result.rows[0].id]);

  await auditService.logAction(req, {
    action: 'activity.create',
    resourceType: 'activity',
    resourceId: activity.id,
    resourceLabel: activity.name,
    commission: 'presidentielle',
    after: activity,
  });

  res.status(201).json({ activity });
}

async function updateActivity(req, res) {
  const { id } = req.params;
  const activity = await db.get('SELECT * FROM activities WHERE id = $1', [id]);
  if (!activity) {
    return res.status(404).json({ error: 'Activité introuvable.' });
  }

  const { name, activityDate, endDate, startTime, description, timeLabel, highlight } = req.body;
  const importance = parseImportance(req.body.importance);
  if (importance === null) {
    return res.status(400).json({ error: 'importance doit être un entier entre 0 et 3.' });
  }

  await db.run(
    `UPDATE activities
        SET name = $1, activity_date = $2, end_date = $3, start_time = $4, description = $5,
            importance = $6, highlight = $7, time_label = $8
      WHERE id = $9`,
    [
      name ?? activity.name,
      activityDate ?? activity.activity_date,
      endDate !== undefined ? endDate || null : activity.end_date,
      startTime !== undefined ? startTime || null : activity.start_time,
      description !== undefined ? description || null : activity.description,
      importance ?? activity.importance,
      highlight !== undefined ? Boolean(highlight) : activity.highlight,
      timeLabel !== undefined ? timeLabel || null : activity.time_label,
      id,
    ]
  );

  const updatedActivity = await db.get('SELECT * FROM activities WHERE id = $1', [id]);

  await auditService.logAction(req, {
    action: 'activity.update',
    resourceType: 'activity',
    resourceId: id,
    resourceLabel: updatedActivity.name,
    commission: 'presidentielle',
    before: activity,
    after: updatedActivity,
  });

  res.json({ activity: updatedActivity });
}

async function deleteActivity(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM activities WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Activité introuvable.' });
  }

  await db.run('DELETE FROM activities WHERE id = $1', [id]);

  await auditService.logAction(req, {
    action: 'activity.delete',
    resourceType: 'activity',
    resourceId: id,
    resourceLabel: existing.name,
    commission: 'presidentielle',
    before: existing,
  });

  res.status(204).send();
}

module.exports = { listActivities, createActivity, updateActivity, deleteActivity };
