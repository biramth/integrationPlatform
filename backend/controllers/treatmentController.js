const db = require('../db/database');
const auditService = require('../services/auditService');

const SLOTS = ['matin', 'midi', 'soir'];
const SLOT_COLUMNS = { matin: 'slot_matin', midi: 'slot_midi', soir: 'slot_soir' };

// Fenêtre d'activité d'un traitement à une date donnée ($1) : commencé, pas
// fini (end_date NULL = durée indéterminée) et pas clôturé manuellement.
// C'est cette condition, appliquée dans chaque requête de lecture, qui retire
// spontanément un DUT1 des listes dès que son traitement est terminé — aucune
// action "retirer de la liste" n'existe, la date fait le travail.
const ACTIVE_ON = '(t.ended_at IS NULL AND t.start_date <= $1 AND (t.end_date IS NULL OR t.end_date >= $1))';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseSlots(body) {
  const slots = body.slots || {};
  return {
    matin: !!slots.matin,
    midi: !!slots.midi,
    soir: !!slots.soir,
  };
}

// Un traitement doit toujours pointer un médicament : soit celui du stock de
// la commission (medication_id), soit un libellé libre — la plupart des DUT1
// se traitent avec leurs propres médicaments. Le nom affiché privilégie le
// stock (source de vérité si renommé) et retombe sur le label figé sinon.
function medicationDisplayName(row) {
  return row.medication_name || row.medication_label || 'Médicament non précisé';
}

async function listTreatments(req, res) {
  // status=active (défaut) : traitements en cours à aujourd'hui ; status=all :
  // tout l'historique (clôturés et passés inclus), pour consultation.
  const showAll = req.query.status === 'all';
  const today = todayIso();

  const rows = await db.all(
    `SELECT t.*, m.name AS medication_name,
       TO_CHAR(t.start_date, 'YYYY-MM-DD') AS start_date_iso,
       TO_CHAR(t.end_date, 'YYYY-MM-DD') AS end_date_iso,
       d.first_name, d.last_name, d.department, r.label AS room_label,
       u.full_name AS ended_by_name,
       ${ACTIVE_ON} AS is_active
     FROM dut1_treatments t
     JOIN dut1_records d ON d.id = t.dut1_id
     LEFT JOIN rooms r ON r.id = d.room_id
     LEFT JOIN medications m ON m.id = t.medication_id
     LEFT JOIN users u ON u.id = t.ended_by
     WHERE ${showAll ? 'TRUE' : ACTIVE_ON}
     ORDER BY d.last_name ASC, d.first_name ASC, t.start_date DESC`,
    [today]
  );

  res.json({
    treatments: rows.map((row) => ({
      id: row.id,
      dut1Id: row.dut1_id,
      firstName: row.first_name,
      lastName: row.last_name,
      department: row.department,
      roomLabel: row.room_label,
      medicationId: row.medication_id,
      medicationName: medicationDisplayName(row),
      dosage: row.dosage,
      slots: { matin: row.slot_matin, midi: row.slot_midi, soir: row.slot_soir },
      // TO_CHAR plutôt que l'objet Date renvoyé par pg pour les colonnes DATE :
      // sérialisée en ISO puis découpée, une date minuit locale se décalerait
      // d'un jour selon le fuseau du serveur.
      startDate: row.start_date_iso,
      endDate: row.end_date_iso,
      notes: row.notes,
      endedAt: row.ended_at,
      endedByName: row.ended_by_name,
      isActive: row.is_active,
    })),
  });
}

async function validatePayload(body) {
  if (!DATE_RE.test(String(body.startDate || ''))) {
    return 'Date de début invalide.';
  }
  if (body.endDate && !DATE_RE.test(String(body.endDate))) {
    return 'Date de fin invalide.';
  }
  if (body.endDate && body.endDate < body.startDate) {
    return 'La date de fin doit suivre la date de début.';
  }

  if (!body.dut1Id) {
    return 'DUT1 requis.';
  }
  const slots = parseSlots(body);
  if (!slots.matin && !slots.midi && !slots.soir) {
    return 'Sélectionnez au moins un créneau de prise (matin, midi ou soir).';
  }
  // Médicament du stock OU libellé libre (médicament personnel) — au moins un.
  if (!body.medicationId && !(body.medicationLabel || '').trim()) {
    return 'Précisez un médicament du stock ou un libellé libre (médicament personnel).';
  }

  const dut1 = await db.get('SELECT id FROM dut1_records WHERE id = $1', [body.dut1Id]);
  if (!dut1) {
    return 'Dossier DUT1 introuvable.';
  }
  if (body.medicationId) {
    const medication = await db.get('SELECT id FROM medications WHERE id = $1', [body.medicationId]);
    if (!medication) {
      return 'Médicament du stock introuvable.';
    }
  }

  return null;
}

function payloadToColumns(body) {
  return [
    body.dut1Id,
    body.medicationId || null,
    (body.medicationLabel || '').trim() || null,
    (body.dosage || '').trim() || null,
    parseSlots(body),
    body.startDate ?? todayIso(),
    body.endDate || null,
    (body.notes || '').trim() || null,
  ];
}

async function createTreatment(req, res) {
  const body = req.body;
  const error = await validatePayload(body);
  if (error) {
    return res.status(400).json({ error });
  }

  const [dut1Id, medicationId, medicationLabel, dosage, slots, startDate, endDate, notes] = payloadToColumns(body);

  try {
    const result = await db.run(
      `INSERT INTO dut1_treatments (dut1_id, medication_id, medication_label, dosage, slot_matin, slot_midi, slot_soir, start_date, end_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [dut1Id, medicationId, medicationLabel, dosage, slots.matin, slots.midi, slots.soir, startDate, endDate, notes, req.user.id]
    );

    const treatment = await db.get(
      `SELECT t.*, d.first_name, d.last_name FROM dut1_treatments t JOIN dut1_records d ON d.id = t.dut1_id WHERE t.id = $1`,
      [result.rows[0].id]
    );

    await auditService.logAction(req, {
      action: 'treatment.create',
      resourceType: 'dut1_treatment',
      resourceId: treatment.id,
      resourceLabel: `${treatment.first_name} ${treatment.last_name}`,
      commission: 'sante',
      after: treatment,
    });

    res.status(201).json({ treatment });
  } catch (err) {
    if (err.code === '23514') {
      return res.status(400).json({ error: 'Au moins un créneau de prise est requis.' });
    }
    throw err;
  }
}

async function updateTreatment(req, res) {
  const { id } = req.params;
  const body = req.body;

  // TO_CHAR pour les dates : la colonne DATE arrive sinon en objet Date, que
  // la validation (format YYYY-MM-DD) rejetterait à tort.
  const current = await db.get(
    `SELECT *, TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date_iso, TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date_iso
     FROM dut1_treatments WHERE id = $1`,
    [id]
  );
  if (!current) {
    return res.status(404).json({ error: 'Traitement introuvable.' });
  }

  // Fusion corps + valeurs existantes AVANT validation : une édition partielle
  // est validée sur le résultat final, pas champ par champ — impossible de
  // se retrouver avec ni médicament du stock ni libellé libre.
  const merged = {
    dut1Id: current.dut1_id,
    medicationId: body.medicationId !== undefined ? body.medicationId || null : current.medication_id,
    medicationLabel:
      body.medicationLabel !== undefined ? (body.medicationLabel || '').trim() || null : current.medication_label,
    dosage: body.dosage !== undefined ? (body.dosage || '').trim() || null : current.dosage,
    slots: body.slots || { matin: current.slot_matin, midi: current.slot_midi, soir: current.slot_soir },
    startDate: body.startDate ?? current.start_date_iso,
    endDate: body.endDate !== undefined ? body.endDate || null : current.end_date_iso,
    notes: body.notes !== undefined ? (body.notes || '').trim() || null : current.notes,
  };

  const error = await validatePayload(merged);
  if (error) {
    return res.status(400).json({ error });
  }

  await db.run(
    `UPDATE dut1_treatments
     SET medication_id = $1, medication_label = $2, dosage = $3,
         slot_matin = $4, slot_midi = $5, slot_soir = $6,
         start_date = $7, end_date = $8, notes = $9, updated_at = NOW()
     WHERE id = $10`,
    [
      merged.medicationId,
      merged.medicationLabel,
      merged.dosage,
      merged.slots.matin,
      merged.slots.midi,
      merged.slots.soir,
      merged.startDate,
      merged.endDate,
      merged.notes,
      id,
    ]
  );

  const treatment = await db.get(
    `SELECT t.*, d.first_name, d.last_name FROM dut1_treatments t JOIN dut1_records d ON d.id = t.dut1_id WHERE t.id = $1`,
    [id]
  );

  await auditService.logAction(req, {
    action: 'treatment.update',
    resourceType: 'dut1_treatment',
    resourceId: Number(id),
    resourceLabel: `${treatment.first_name} ${treatment.last_name}`,
    commission: 'sante',
    before,
    after: treatment,
  });

  res.json({ treatment });
}

// Clôture anticipée ("le médecin a arrêté le traitement") : le traitement
// reste dans l'historique mais sort immédiatement des prises du jour et des
// badges, même si sa date de fin était plus lointaine ou absente.
async function endTreatment(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM dut1_treatments WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Traitement introuvable.' });
  }
  if (existing.ended_at) {
    return res.status(400).json({ error: 'Traitement déjà clôturé.' });
  }

  await db.run('UPDATE dut1_treatments SET ended_at = NOW(), ended_by = $1, updated_at = NOW() WHERE id = $2', [
    req.user.id,
    id,
  ]);

  const treatment = await db.get(
    `SELECT t.*, d.first_name, d.last_name FROM dut1_treatments t JOIN dut1_records d ON d.id = t.dut1_id WHERE t.id = $1`,
    [id]
  );

  await auditService.logAction(req, {
    action: 'treatment.end',
    resourceType: 'dut1_treatment',
    resourceId: Number(id),
    resourceLabel: `${treatment.first_name} ${treatment.last_name}`,
    commission: 'sante',
    before: existing,
    after: treatment,
  });

  res.json({ treatment });
}

async function deleteTreatment(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM dut1_treatments WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Traitement introuvable.' });
  }

  await db.transaction(async (client) => {
    await client.run('DELETE FROM dut1_treatments WHERE id = $1', [id]);
    // La migration du schéma recrée un traitement pour tout DUT1 encore
    // marqué on_treatment = TRUE en phase 2 : supprimer explicitement un
    // traitement signifie "plus de traitement", on aligne donc le vieux flag
    // pour qu'il ne réapparaisse pas au prochain déploiement.
    await client.run('UPDATE dut1_records SET on_treatment = FALSE WHERE id = $1 AND on_treatment = TRUE', [
      existing.dut1_id,
    ]);
  });

  const dut1 = await db.get('SELECT first_name, last_name FROM dut1_records WHERE id = $1', [existing.dut1_id]);

  await auditService.logAction(req, {
    action: 'treatment.delete',
    resourceType: 'dut1_treatment',
    resourceId: Number(id),
    resourceLabel: dut1 ? `${dut1.first_name} ${dut1.last_name}` : undefined,
    commission: 'sante',
    before: existing,
  });

  res.status(204).send();
}

// Prises du jour, groupées par créneau : chaque entrée porte déjà son état
// "pris" (qui a coché, quand), ce qui permet à l'écran de répondre d'un coup
// d'œil à "qui doit prendre quoi maintenant, et est-ce que tout le monde est
// passé ?" — matin, midi et soir sont calculés en une seule requête.
async function getSchedule(req, res) {
  const { date } = req.query;
  if (!date || !DATE_RE.test(date)) {
    return res.status(400).json({ error: 'Date requise (YYYY-MM-DD).' });
  }

  const rows = await db.all(
    `SELECT t.id AS treatment_id, t.dut1_id, t.dosage, t.notes, t.medication_label,
            t.slot_matin, t.slot_midi, t.slot_soir, m.name AS medication_name,
            d.first_name, d.last_name, d.department, r.label AS room_label,
            ti.slot AS taken_slot, ti.marked_at, u.full_name AS marked_by_name
     FROM dut1_treatments t
     JOIN dut1_records d ON d.id = t.dut1_id
     LEFT JOIN rooms r ON r.id = d.room_id
     LEFT JOIN medications m ON m.id = t.medication_id
     LEFT JOIN treatment_intakes ti ON ti.treatment_id = t.id AND ti.intake_date = $1
     LEFT JOIN users u ON u.id = ti.marked_by
     WHERE ${ACTIVE_ON}
     ORDER BY d.last_name ASC, d.first_name ASC`,
    [date]
  );

  const byTreatment = new Map();
  for (const row of rows) {
    if (!byTreatment.has(row.treatment_id)) {
      byTreatment.set(row.treatment_id, { row, intakes: new Map() });
    }
    const entry = byTreatment.get(row.treatment_id);
    if (row.taken_slot) {
      entry.intakes.set(row.taken_slot, { markedAt: row.marked_at, markedByName: row.marked_by_name });
    }
  }

  const slots = { matin: [], midi: [], soir: [] };
  for (const { row, intakes } of byTreatment.values()) {
    const base = {
      treatmentId: row.treatment_id,
      dut1Id: row.dut1_id,
      firstName: row.first_name,
      lastName: row.last_name,
      department: row.department,
      roomLabel: row.room_label,
      medicationName: medicationDisplayName(row),
      dosage: row.dosage,
      notes: row.notes,
    };
    for (const slot of SLOTS) {
      if (!row[SLOT_COLUMNS[slot]]) continue;
      const intake = intakes.get(slot);
      slots[slot].push({
        ...base,
        slot,
        taken: !!intake,
        takenAt: intake?.markedAt || null,
        takenByName: intake?.markedByName || null,
      });
    }
  }

  const payloadSlots = {};
  for (const slot of SLOTS) {
    payloadSlots[slot] = {
      total: slots[slot].length,
      takenCount: slots[slot].filter((i) => i.taken).length,
      items: slots[slot],
    };
  }

  res.json({ date, slots: payloadSlots });
}

// Cochage/décochage d'une prise : upsert idempotent côté cochage, suppression
// sèche côté décochage (correction d'erreur autorisée, cf. décisions équipe).
async function markIntake(req, res) {
  const { id } = req.params;
  const { date, slot, taken } = req.body;

  if (!DATE_RE.test(String(date || ''))) {
    return res.status(400).json({ error: 'Date invalide (YYYY-MM-DD).' });
  }
  if (!SLOTS.includes(slot)) {
    return res.status(400).json({ error: 'Créneau invalide.' });
  }
  if (typeof taken !== 'boolean') {
    return res.status(400).json({ error: '"taken" (true/false) requis.' });
  }

  // TO_CHAR pour comparer des chaînes ISO : la colonne DATE arrive sinon en
  // objet Date (minuit local), incomparable directement avec 'YYYY-MM-DD'.
  const treatment = await db.get(
    `SELECT *, TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date_iso, TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date_iso
     FROM dut1_treatments WHERE id = $1`,
    [id]
  );
  if (!treatment) {
    return res.status(404).json({ error: 'Traitement introuvable.' });
  }
  if (
    treatment.ended_at ||
    date < treatment.start_date_iso ||
    (treatment.end_date_iso && date > treatment.end_date_iso)
  ) {
    return res.status(400).json({ error: "Ce traitement n'est pas actif à cette date." });
  }
  if (!treatment[SLOT_COLUMNS[slot]]) {
    return res.status(400).json({ error: 'Aucune prise prévue à ce créneau pour ce traitement.' });
  }

  if (taken) {
    await db.run(
      `INSERT INTO treatment_intakes (treatment_id, intake_date, slot, marked_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (treatment_id, intake_date, slot)
       DO UPDATE SET marked_by = EXCLUDED.marked_by, marked_at = NOW()`,
      [id, date, slot, req.user.id]
    );
  } else {
    await db.run('DELETE FROM treatment_intakes WHERE treatment_id = $1 AND intake_date = $2 AND slot = $3', [
      id,
      date,
      slot,
    ]);
  }

  const dut1 = await db.get('SELECT first_name, last_name FROM dut1_records WHERE id = $1', [treatment.dut1_id]);
  const label = dut1 ? `${dut1.first_name} ${dut1.last_name}` : undefined;

  await auditService.logAction(req, {
    action: taken ? 'treatment.intake_mark' : 'treatment.intake_unmark',
    resourceType: 'treatment_intake',
    resourceId: Number(id),
    resourceLabel: label ? `${label} — ${slot} du ${date}` : undefined,
    commission: 'sante',
    after: { treatment_id: Number(id), intake_date: date, slot, taken },
  });

  res.json({ treatmentId: Number(id), date, slot, taken });
}

module.exports = {
  listTreatments,
  createTreatment,
  updateTreatment,
  endTreatment,
  deleteTreatment,
  getSchedule,
  markIntake,
};
