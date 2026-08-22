const db = require('../db/database');
const auditService = require('../services/auditService');

const SEVERITY_WEIGHT = { severe: 3, moderee: 2, legere: 1 };

// Orga, Présidentielle et Dreudj voient Risques du jour pour savoir QUI est à
// risque aujourd'hui (utile pour l'organisation logistique/des activités),
// jamais POURQUOI — le détail médical (quel allergène, quel traitement, quel
// motif de restriction) reste réservé à Santé, cf. "le médical reste médical".
const NON_MEDICAL_RISK_ROLES = ['orga', 'presidentielle', 'dreudj'];

function stripRiskMedicalDetails(entry) {
  return {
    id: entry.id,
    firstName: entry.firstName,
    lastName: entry.lastName,
    department: entry.department,
    gender: entry.gender,
    roomLabel: entry.roomLabel,
    atRisk: true,
  };
}

async function getRisks(req, res) {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'date requise (YYYY-MM-DD).' });
  }

  const allergyRows = await db.all(
    `SELECT DISTINCT
       d.id, d.first_name, d.last_name, d.department, d.gender, r.label AS room_label,
       a.label AS allergen_label, da.severity,
       dish.name AS dish_name, ms.meal_type AS meal_type
     FROM dut1_records d
     JOIN dut1_allergens da ON da.dut1_id = d.id
     JOIN allergens a ON a.id = da.allergen_id
     JOIN dish_allergens dga ON dga.allergen_id = a.id
     JOIN dishes dish ON dish.id = dga.dish_id
     JOIN meal_services ms ON ms.id = dish.meal_service_id
     LEFT JOIN rooms r ON r.id = d.room_id
     WHERE ms.service_date = $1
     ORDER BY d.last_name, d.first_name`,
    [date]
  );

  const restrictionRows = await db.all(
    `SELECT
       d.id, d.first_name, d.last_name, d.department, d.gender, r.label AS room_label,
       hr.reason, hr.end_date, act.name AS activity_name
     FROM health_restrictions hr
     JOIN dut1_records d ON d.id = hr.dut1_id
     LEFT JOIN rooms r ON r.id = d.room_id
     LEFT JOIN activities act ON act.id = hr.activity_id
     WHERE hr.resolved_at IS NULL
       AND hr.start_date <= $1
       AND (hr.end_date IS NULL OR hr.end_date >= $1)
     ORDER BY d.last_name, d.first_name`,
    [date]
  );

  // Traitement médical en cours (déclaré en phase 2) : pas de bornes de dates
  // dans le questionnaire, donc un traitement déclaré est considéré actif tant
  // qu'il n'est pas mis à jour — signalé sur "risques du jour" comme les
  // allergies et restrictions.
  const treatmentRows = await db.all(
    `SELECT d.id, d.first_name, d.last_name, d.department, d.gender, r.label AS room_label, d.treatment_details
     FROM dut1_records d
     LEFT JOIN rooms r ON r.id = d.room_id
     WHERE d.on_treatment = TRUE`
  );

  const byDut1 = new Map();
  function ensure(row) {
    if (!byDut1.has(row.id)) {
      byDut1.set(row.id, {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        department: row.department,
        gender: row.gender,
        roomLabel: row.room_label,
        allergyMatches: [],
        restrictions: [],
        treatmentDetails: null,
      });
    }
    return byDut1.get(row.id);
  }

  for (const row of allergyRows) {
    ensure(row).allergyMatches.push({
      allergen: row.allergen_label,
      severity: row.severity,
      dish: row.dish_name,
      mealType: row.meal_type,
    });
  }
  for (const row of restrictionRows) {
    ensure(row).restrictions.push({
      reason: row.reason,
      activityName: row.activity_name || null,
      endDate: row.end_date,
    });
  }
  for (const row of treatmentRows) {
    ensure(row).treatmentDetails = row.treatment_details;
  }

  const result = Array.from(byDut1.values()).map((entry) => {
    const maxAllergySeverity = entry.allergyMatches.reduce(
      (max, m) => Math.max(max, SEVERITY_WEIGHT[m.severity] || 0),
      0
    );
    const sortWeight = Math.max(
      maxAllergySeverity,
      entry.restrictions.length > 0 ? 3 : 0,
      entry.treatmentDetails ? 2 : 0
    );
    return { ...entry, sortWeight };
  });

  result.sort((a, b) => b.sortWeight - a.sortWeight || a.lastName.localeCompare(b.lastName));

  const payload = NON_MEDICAL_RISK_ROLES.includes(req.user.role) ? result.map(stripRiskMedicalDetails) : result;

  res.json({ atRiskDut1: payload });
}

async function declareRestriction(req, res) {
  const { id } = req.params;
  const { startDate, endDate, reason, activityId } = req.body;

  if (!startDate || !reason) {
    return res.status(400).json({ error: 'startDate et reason sont requis.' });
  }

  const dut1 = await db.get('SELECT id, first_name, last_name FROM dut1_records WHERE id = $1', [id]);
  if (!dut1) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  try {
    const result = await db.run(
      `INSERT INTO health_restrictions (dut1_id, activity_id, start_date, end_date, reason, declared_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [id, activityId || null, startDate, endDate || null, reason, req.user.id]
    );

    const record = await db.get('SELECT * FROM health_restrictions WHERE id = $1', [result.rows[0].id]);

    await auditService.logAction(req, {
      action: 'health_restriction.create',
      resourceType: 'health_restriction',
      resourceId: record.id,
      resourceLabel: `${dut1.first_name} ${dut1.last_name}`,
      commission: 'sante',
      after: record,
    });

    res.status(201).json({ restriction: record });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Activité invalide.' });
    }
    throw err;
  }
}

async function listRestrictionsForDut1(req, res) {
  const records = await db.all(
    `SELECT hr.*, act.name AS activity_name
     FROM health_restrictions hr
     LEFT JOIN activities act ON act.id = hr.activity_id
     WHERE hr.dut1_id = $1
     ORDER BY hr.start_date DESC, hr.id DESC`,
    [req.params.id]
  );
  res.json({ restrictions: records });
}

async function listActiveRestrictions(req, res) {
  const records = await db.all(
    `SELECT hr.*, act.name AS activity_name, d.first_name, d.last_name, d.department, r.label AS room_label
     FROM health_restrictions hr
     JOIN dut1_records d ON d.id = hr.dut1_id
     LEFT JOIN rooms r ON r.id = d.room_id
     LEFT JOIN activities act ON act.id = hr.activity_id
     WHERE hr.resolved_at IS NULL
     ORDER BY hr.start_date ASC, d.last_name ASC`
  );
  res.json({ restrictions: records });
}

async function listOnTreatment(req, res) {
  const records = await db.all(
    `SELECT d.id, d.first_name, d.last_name, d.department, d.gender, d.treatment_details, r.label AS room_label
     FROM dut1_records d
     LEFT JOIN rooms r ON r.id = d.room_id
     WHERE d.on_treatment = TRUE
     ORDER BY d.last_name ASC, d.first_name ASC`
  );
  res.json({ dut1: records });
}

async function resolveRestriction(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM health_restrictions WHERE id = $1', [id]);
  if (!existing || existing.resolved_at) {
    return res.status(404).json({ error: 'Restriction introuvable ou déjà résolue.' });
  }

  await db.run(
    `UPDATE health_restrictions SET resolved_at = NOW(), resolved_by = $1 WHERE id = $2`,
    [req.user.id, id]
  );

  const restriction = await db.get('SELECT * FROM health_restrictions WHERE id = $1', [id]);

  await auditService.logAction(req, {
    action: 'health_restriction.resolve',
    resourceType: 'health_restriction',
    resourceId: id,
    commission: 'sante',
    before: existing,
    after: restriction,
  });

  res.json({ restriction });
}

async function deleteRestriction(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM health_restrictions WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Restriction introuvable.' });
  }

  await db.run('DELETE FROM health_restrictions WHERE id = $1', [id]);

  await auditService.logAction(req, {
    action: 'health_restriction.delete',
    resourceType: 'health_restriction',
    resourceId: id,
    commission: 'sante',
    before: existing,
  });

  res.status(204).send();
}

module.exports = {
  getRisks,
  declareRestriction,
  listRestrictionsForDut1,
  listActiveRestrictions,
  listOnTreatment,
  resolveRestriction,
  deleteRestriction,
};
