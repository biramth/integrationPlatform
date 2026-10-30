const db = require('../db/database');
const auditService = require('../services/auditService');
const cache = require('../middleware/cache');

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

  // Les quatre requêtes ci-dessous sont indépendantes : aucune n'a besoin du
  // résultat d'une autre, elles partent donc ensemble. Les deux dernières
  // filtrent elles-mêmes sur les activités du jour (jointure sur activities) :
  // l'ancien enchaînement chargeait d'abord les activités, puis attendait pour
  // lancer critères et aptitude — un second aller-retour Supabase (~80 ms) sur
  // un écran jamais mis en cache. Le pool (10 connexions) absorbe sans
  // difficulté ces requêtes simultanées.
  const [allergyRows, restrictionRows, requiredCriteriaRows, aptitudeRows] = await Promise.all([
    db.all(
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
    ),
    db.all(
      `SELECT
       d.id, d.first_name, d.last_name, d.department, d.gender, r.label AS room_label,
       hr.reason, hr.end_date, hr.criterion_id, act.name AS activity_name
     FROM health_restrictions hr
     JOIN dut1_records d ON d.id = hr.dut1_id
     LEFT JOIN rooms r ON r.id = d.room_id
     LEFT JOIN activities act ON act.id = hr.activity_id
     WHERE hr.resolved_at IS NULL
       AND hr.start_date <= $1
       AND (hr.end_date IS NULL OR hr.end_date >= $1)
     ORDER BY d.last_name, d.first_name`,
      [date]
    ),
    // Un critère lié à une restriction ponctuelle (hr.criterion_id) s'applique
    // automatiquement à toute activité du jour qui l'exige, sans que l'agent
    // ait eu besoin de lier la restriction à cette activité précise au moment
    // de la déclarer — seul un lien explicite (hr.activity_id) restait limité
    // à une activité choisie à l'avance.
    db.all(
      `SELECT arc.activity_id, arc.criterion_id, ac.label AS criterion_label,
         lvl.rank AS min_rank, lvl.label AS min_level_label, act.name AS activity_name
       FROM activity_required_criteria arc
       JOIN aptitude_criteria ac ON ac.id = arc.criterion_id
       JOIN aptitude_criterion_levels lvl ON lvl.id = arc.min_level_id
       JOIN activities act ON act.id = arc.activity_id
         AND $1 BETWEEN act.activity_date AND COALESCE(act.end_date, act.activity_date)`,
      [date]
    ),
    // Écarts d'aptitude calculés en SQL : l'ancienne version chargeait tous les
    // dossiers complétés et tous les niveaux déclarés en Node, puis les croisait
    // en boucle. Sur une instance à 0,1 CPU, c'était le poste le plus lourd de
    // l'écran dès quelques centaines de dossiers ; ici la jointure ne fait
    // remonter que les écarts réels.
    db.all(
      `SELECT d.id, d.first_name, d.last_name, d.department, d.gender,
         r.label AS room_label,
         arc.activity_id, ac.label AS criterion_label,
         lvl.label AS min_level_label, own.label AS own_label, act.name AS activity_name
       FROM activity_required_criteria arc
       JOIN aptitude_criteria ac ON ac.id = arc.criterion_id
       JOIN aptitude_criterion_levels lvl ON lvl.id = arc.min_level_id
       JOIN activities act ON act.id = arc.activity_id
         AND $1 BETWEEN act.activity_date AND COALESCE(act.end_date, act.activity_date)
       JOIN dut1_records d ON d.complementary_completed_at IS NOT NULL
       LEFT JOIN rooms r ON r.id = d.room_id
       LEFT JOIN dut1_aptitude_levels dal
         ON dal.dut1_id = d.id AND dal.criterion_id = arc.criterion_id
       LEFT JOIN aptitude_criterion_levels own ON own.id = dal.level_id
       WHERE own.rank IS NULL OR own.rank < lvl.rank`,
      [date]
    ),
  ]);

  // Pour la restriction ponctuelle (blocage total, pas de niveau) : simple
  // regroupement activité(s) par critère, comme avant.
  const activitiesByCriterion = new Map();
  for (const row of requiredCriteriaRows) {
    if (!activitiesByCriterion.has(row.criterion_id)) activitiesByCriterion.set(row.criterion_id, new Set());
    activitiesByCriterion.get(row.criterion_id).add(row.activity_name);
  }

  // Profil d'aptitude saisi à l'enregistrement (dut1_aptitude_levels, question
  // phase 2 "aptitude" obligatoire) : un niveau par critère, jamais déclaré au
  // coup par coup — dès que le rang du niveau déclaré est inférieur au rang
  // minimum exigé par une activité du jour (ou qu'aucun niveau n'a été
  // renseigné pour ce critère, dossier complété avant son ajout), le DUT1
  // apparaît automatiquement à risque pour cette activité.
  const aptitudeMismatches = aptitudeRows.map(({ activity_name: activityName, ...row }) => ({
    ...row,
    reason: row.own_label
      ? `${row.criterion_label} : niveau requis "${row.min_level_label}", actuellement "${row.own_label}"`
      : `${row.criterion_label} : niveau requis "${row.min_level_label}", non renseigné`,
    activityName,
  }));

  // Traitement médical : n'apparaît plus ici. Un traitement suivi vit dans
  // dut1_treatments (cf. treatmentController.js) avec ses propres créneaux de
  // prise et sa fenêtre de dates — il se gère depuis la page Traitements, pas
  // comme un "risque du jour" : suivre des prises de médicaments n'a rien à
  // voir avec signaler un danger ponctuel (allergène au menu, inaptitude).

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
    const activityNames = new Set();
    if (row.activity_name) activityNames.add(row.activity_name);
    if (row.criterion_id && activitiesByCriterion.has(row.criterion_id)) {
      for (const name of activitiesByCriterion.get(row.criterion_id)) activityNames.add(name);
    }
    ensure(row).restrictions.push({
      reason: row.reason,
      activityNames: Array.from(activityNames),
      endDate: row.end_date,
    });
  }
  for (const mismatch of aptitudeMismatches) {
    ensure(mismatch).restrictions.push({
      reason: mismatch.reason,
      activityNames: [mismatch.activityName],
      endDate: null,
    });
  }

  const result = Array.from(byDut1.values()).map((entry) => {
    const maxAllergySeverity = entry.allergyMatches.reduce(
      (max, m) => Math.max(max, SEVERITY_WEIGHT[m.severity] || 0),
      0
    );
    const sortWeight = Math.max(maxAllergySeverity, entry.restrictions.length > 0 ? 3 : 0);
    return { ...entry, sortWeight };
  });

  result.sort((a, b) => b.sortWeight - a.sortWeight || a.lastName.localeCompare(b.lastName));

  const payload = NON_MEDICAL_RISK_ROLES.includes(req.user.role) ? result.map(stripRiskMedicalDetails) : result;

  res.json({ atRiskDut1: payload });
}

async function declareRestriction(req, res) {
  const { id } = req.params;
  const { startDate, endDate, reason, activityId, criterionId } = req.body;

  if (!startDate || !reason) {
    return res.status(400).json({ error: 'startDate et reason sont requis.' });
  }

  const dut1 = await db.get('SELECT id, first_name, last_name FROM dut1_records WHERE id = $1', [id]);
  if (!dut1) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  try {
    const result = await db.run(
      `INSERT INTO health_restrictions (dut1_id, activity_id, start_date, end_date, reason, criterion_id, declared_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [id, activityId || null, startDate, endDate || null, reason, criterionId || null, req.user.id]
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

    cache.invalidate('/api/stats');

    res.status(201).json({ restriction: record });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Activité ou critère invalide.' });
    }
    throw err;
  }
}

async function listRestrictionsForDut1(req, res) {
  const records = await db.all(
    `SELECT hr.*, act.name AS activity_name, ac.label AS criterion_label
     FROM health_restrictions hr
     LEFT JOIN activities act ON act.id = hr.activity_id
     LEFT JOIN aptitude_criteria ac ON ac.id = hr.criterion_id
     WHERE hr.dut1_id = $1
     ORDER BY hr.start_date DESC, hr.id DESC`,
    [req.params.id]
  );
  res.json({ restrictions: records });
}

async function listActiveRestrictions(req, res) {
  const records = await db.all(
    `SELECT hr.*, act.name AS activity_name, ac.label AS criterion_label,
       d.first_name, d.last_name, d.department, r.label AS room_label
     FROM health_restrictions hr
     JOIN dut1_records d ON d.id = hr.dut1_id
     LEFT JOIN rooms r ON r.id = d.room_id
     LEFT JOIN activities act ON act.id = hr.activity_id
     LEFT JOIN aptitude_criteria ac ON ac.id = hr.criterion_id
     WHERE hr.resolved_at IS NULL
     ORDER BY hr.start_date ASC, d.last_name ASC`
  );
  res.json({ restrictions: records });
}

// "Sous traitement" : dérivé des traitements réellement actifs à aujourd'hui
// (dut1_treatments) et plus du vieux flag phase 2 — dès qu'un traitement est
// fini (date de fin passée ou clôturé), le DUT1 disparaît de cette liste sans
// intervention. treatment_details agrège les libellés quand il y en a plusieurs.
async function listOnTreatment(req, res) {
  const records = await db.all(
    `SELECT d.id, d.first_name, d.last_name, d.department, d.gender, r.label AS room_label,
            STRING_AGG(COALESCE(m.name, t.medication_label, 'Médicament non précisé'), ' + ') AS treatment_details
     FROM dut1_treatments t
     JOIN dut1_records d ON d.id = t.dut1_id
     LEFT JOIN rooms r ON r.id = d.room_id
     LEFT JOIN medications m ON m.id = t.medication_id
     WHERE t.ended_at IS NULL AND t.start_date <= CURRENT_DATE AND (t.end_date IS NULL OR t.end_date >= CURRENT_DATE)
     GROUP BY d.id, d.first_name, d.last_name, d.department, d.gender, r.label
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

  cache.invalidate('/api/stats');

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

  cache.invalidate('/api/stats');

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
