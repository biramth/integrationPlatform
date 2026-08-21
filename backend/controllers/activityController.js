const db = require('../db/database');

async function listActivities(req, res) {
  const activities = await db.all(
    'SELECT * FROM activities ORDER BY activity_date ASC, start_time ASC NULLS LAST, name ASC'
  );
  res.json({ activities });
}

async function createActivity(req, res) {
  const { name, activityDate, endDate, startTime, description } = req.body;
  if (!name || !activityDate) {
    return res.status(400).json({ error: 'name et activityDate sont requis.' });
  }

  const result = await db.run(
    'INSERT INTO activities (name, activity_date, end_date, start_time, description, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [name, activityDate, endDate || null, startTime || null, description || null, req.user.id]
  );

  const activity = await db.get('SELECT * FROM activities WHERE id = $1', [result.rows[0].id]);
  res.status(201).json({ activity });
}

async function updateActivity(req, res) {
  const { id } = req.params;
  const activity = await db.get('SELECT * FROM activities WHERE id = $1', [id]);
  if (!activity) {
    return res.status(404).json({ error: 'Activité introuvable.' });
  }

  const { name, activityDate, endDate, startTime, description } = req.body;

  await db.run(
    `UPDATE activities SET name = $1, activity_date = $2, end_date = $3, start_time = $4, description = $5 WHERE id = $6`,
    [
      name ?? activity.name,
      activityDate ?? activity.activity_date,
      endDate !== undefined ? endDate || null : activity.end_date,
      startTime !== undefined ? startTime || null : activity.start_time,
      description !== undefined ? description || null : activity.description,
      id,
    ]
  );

  res.json({ activity: await db.get('SELECT * FROM activities WHERE id = $1', [id]) });
}

async function deleteActivity(req, res) {
  const result = await db.run('DELETE FROM activities WHERE id = $1', [req.params.id]);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Activité introuvable.' });
  }
  res.status(204).send();
}

module.exports = { listActivities, createActivity, updateActivity, deleteActivity };
