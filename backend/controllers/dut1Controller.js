const db = require('../db/database');
const { DEPARTMENTS, DEPARTMENT_LABELS } = require('../constants/departments');
const { autoAssignRoom, getHistoryForDut1 } = require('../services/roomAssignmentService');
const auditService = require('../services/auditService');
const { getSetting } = require('../services/platformSettingsService');
const cache = require('../middleware/cache');
const storage = require('../services/storageService');
const { validateTreatmentPayload } = require('./treatmentController');
const { normalizeName, namesSimilar } = require('../utils/fuzzyNames');

const ALLERGENS_SUBQUERY = `(
  SELECT COALESCE(json_agg(json_build_object('id', a.id, 'label', a.label, 'severity', da.severity)), '[]'::json)
  FROM dut1_allergens da JOIN allergens a ON a.id = da.allergen_id
  WHERE da.dut1_id = d.id
) AS allergens_json`;

const APTITUDE_LEVELS_SUBQUERY = `(
  SELECT COALESCE(json_agg(json_build_object(
      'criterionId', ac.id, 'criterionLabel', ac.label,
      'levelId', lvl.id, 'levelLabel', lvl.label, 'rank', lvl.rank
    )), '[]'::json)
  FROM dut1_aptitude_levels dal
  JOIN aptitude_criteria ac ON ac.id = dal.criterion_id
  JOIN aptitude_criterion_levels lvl ON lvl.id = dal.level_id
  WHERE dal.dut1_id = d.id
) AS aptitude_levels_json`;

const LUGGAGE_ITEMS_COUNT_SUBQUERY = `(
  SELECT COUNT(*) FROM luggage_items li WHERE li.dut1_id = d.id
) AS luggage_items_count`;

const LUGGAGE_SENSITIVE_SUBQUERY = `(
  SELECT COUNT(*) FROM luggage_items li WHERE li.dut1_id = d.id AND li.is_sensitive = TRUE
) AS luggage_sensitive_count`;

function serializeRecord(record) {
  if (!record) return null;
  return {
    ...record,
    extra_fields: record.extra_fields_json ? JSON.parse(record.extra_fields_json) : null,
    emergencyContacts: parseEmergencyContacts(record.emergency_contacts_json),
    allergens: 'allergens_json' in record ? record.allergens_json : undefined,
    aptitude_levels: 'aptitude_levels_json' in record ? record.aptitude_levels_json : undefined,
  };
}

// Contacts d'urgence (remplace père/mère dans le formulaire d'enregistrement) :
// liste libre [{ name, phone }] stockée en JSON — les lignes vides sont
// ignorées, jamais bloquantes à la lecture.
function parseEmergencyContacts(json) {
  try {
    const list = json ? JSON.parse(json) : [];
    if (!Array.isArray(list)) return [];
    return list
      .map((c) => ({ name: typeof c?.name === 'string' ? c.name.trim() : '', phone: typeof c?.phone === 'string' ? c.phone.trim() : '' }))
      .filter((c) => c.name || c.phone);
  } catch {
    return [];
  }
}

function normalizeEmergencyContacts(input) {
  if (!Array.isArray(input)) return null;
  return input
    .map((c) => ({ name: typeof c?.name === 'string' ? c.name.trim() : '', phone: typeof c?.phone === 'string' ? c.phone.trim() : '' }))
    .filter((c) => c.name || c.phone);
}

// Communication et Présidentielle ont accès à l'annuaire (nom, département,
// chambre, téléphone…) mais rien de médical : ni allergènes, ni traitement, ni
// les champs libres de la phase 2 qui peuvent contenir des informations de santé.
const NON_MEDICAL_ROLES = ['communication', 'presidentielle'];
const MEDICAL_FIELDS = [
  'allergens',
  'allergens_json',
  'on_treatment',
  'treatment_details',
  'extra_fields',
  'extra_fields_json',
  'aptitude_levels',
  'aptitude_levels_json',
];

function stripMedicalFields(record) {
  if (!record) return record;
  const clean = { ...record };
  for (const field of MEDICAL_FIELDS) delete clean[field];
  return clean;
}

function validateBasicPayload(body) {
  const required = ['lastName', 'firstName', 'birthDate', 'birthPlace', 'gender', 'department'];
  for (const field of required) {
    if (!body[field]) {
      return `Le champ ${field} est requis.`;
    }
  }
  // Longueurs max raisonnables : empêche les payloads géants sans casser
  // la variabilité réelle des noms, lieux, adresses, etc.
  const MAX_LEN = 500;
  for (const field of ['lastName', 'firstName', 'birthPlace', 'address']) {
    if (body[field] && body[field].length > MAX_LEN) {
      return `Le champ ${field} ne peut dépasser ${MAX_LEN} caractères.`;
    }
  }
  if (body.phoneNumber && body.phoneNumber.length > 30) {
    return 'Le numéro de téléphone ne peut dépasser 30 caractères.';
  }
  // Format date de naissance : YYYY-MM-DD
  if (body.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.birthDate)) {
    return 'birthDate doit être au format YYYY-MM-DD.';
  }
  if (!['M', 'F'].includes(body.gender)) {
    return 'gender doit être M ou F.';
  }
  if (!DEPARTMENTS.includes(body.department)) {
    return `department doit être l'un de : ${DEPARTMENTS.join(', ')}.`;
  }
  const contacts = normalizeEmergencyContacts(body.emergencyContacts);
  if (!contacts || !contacts.some((c) => c.phone)) {
    return 'Au moins un numéro à contacter en cas d\'urgence (emergencyContacts) est requis.';
  }
  // Validation format des téléphones d'urgence (si fournis)
  for (const c of contacts) {
    if (c.phone && !/^\+?[\d\s\-()]{7,30}$/.test(c.phone)) {
      return `Numéro de téléphone invalide : "${c.phone}". Format attendu : +XXX XXX XXX.`;
    }
  }
  return null;
}

async function createRecord(req, res) {
  const error = validateBasicPayload(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const {
    studentNumber,
    lastName,
    firstName,
    birthDate,
    birthPlace,
    gender,
    phoneNumber,
    department,
    emergencyContacts,
    address,
    admittedStudentId,
    confirmDuplicate,
  } = req.body;

  // Trois cas, un seul traitement — demander une confirmation explicite,
  // jamais bloquer tout seul (des homonymes existent réellement) :
  //  - doublon exact : nom + prénom + date de naissance identiques ;
  //  - doublon flou : même date de naissance mais nom/prénom orthographiés
  //    presque pareil — typique du même dossier saisi deux fois avec une
  //    coquille (le référentiel des admis importé contient lui-même des noms
  //    déformés par le convertisseur PDF→Excel) ;
  //  - création parallèle par deux agents en même temps.
  // La table est petite (une édition = quelques centaines de dossiers), le
  // scoring en JS après un SELECT simple reste négligeable.
  if (!confirmDuplicate) {
    const candidates = await db.all(
      `SELECT id, first_name, last_name, birth_date, department,
         (SELECT label FROM rooms WHERE id = dut1_records.room_id) AS room_label
       FROM dut1_records`
    );
    const exact = candidates.find(
      (c) =>
        normalizeName(c.last_name) === normalizeName(lastName) &&
        normalizeName(c.first_name) === normalizeName(firstName) &&
        c.birth_date === birthDate
    );
    const similar =
      !exact &&
      candidates.find(
        (c) =>
          birthDate &&
          c.birth_date === birthDate &&
          namesSimilar(c.last_name, lastName) &&
          namesSimilar(c.first_name, firstName)
      );
    const existing = exact || similar;
    if (existing) {
      return res.status(409).json({
        error: exact
          ? 'Un dossier avec ce nom, prénom et cette date de naissance existe déjà.'
          : 'Un dossier très proche existe déjà (même date de naissance, nom orthographié presque pareil) — vérifie qu\u2019il ne s\u2019agit pas de la même personne.',
        duplicate: {
          id: existing.id,
          firstName: existing.first_name,
          lastName: existing.last_name,
          department: existing.department,
          roomLabel: existing.room_label,
        },
      });
    }
  }

  try {
    const result = await db.run(
      `INSERT INTO dut1_records
        (student_number, last_name, first_name, birth_date, birth_place, gender, phone_number,
         department, emergency_contacts_json, address, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        studentNumber || null,
        lastName,
        firstName,
        birthDate,
        birthPlace,
        gender,
        phoneNumber || null,
        department,
        JSON.stringify(normalizeEmergencyContacts(emergencyContacts)),
        address || null,
        req.user.id,
      ]
    );

    const dut1Id = result.rows[0].id;

    // Auto-réparation du référentiel des admis : le nom tapé par l'agent vient
    // de la pièce d'identité du DUT1, donc il est plus fiable que la conversion
    // du fichier officiel. Si les orthographes diffèrent ("Marne" importé vs
    // "Mame" saisi), on répare la ligne de l'admis avec la saisie humaine —
    // le référentiel se corrige tout seul au fil des enregistrements.
    let repaired = null;
    if (admittedStudentId) {
      const admitted = await db.get(
        'SELECT id, last_name, first_name FROM admitted_students WHERE id = $1',
        [Number(admittedStudentId)]
      );
      if (admitted) {
        // Lien best-effort, jamais bloquant : le dossier existe déjà même si ce
        // candidat de l'import a entretemps été relié à un autre dossier.
        await db.run(
          'UPDATE admitted_students SET matched_dut1_id = $1 WHERE id = $2 AND matched_dut1_id IS NULL',
          [dut1Id, admitted.id]
        );

        const cleanFirst = firstName.trim();
        const cleanLast = lastName.trim();
        if (
          normalizeName(cleanFirst) !== normalizeName(admitted.first_name) ||
          normalizeName(cleanLast) !== normalizeName(admitted.last_name)
        ) {
          await db.run('UPDATE admitted_students SET last_name = $1, first_name = $2 WHERE id = $3', [
            cleanLast,
            cleanFirst,
            admitted.id,
          ]);
          repaired = {
            from: { firstName: admitted.first_name, lastName: admitted.last_name },
            to: { firstName: cleanFirst, lastName: cleanLast },
          };
          await auditService.logAction(req, {
            action: 'admitted_students.name_repair',
            resourceType: 'admitted_students',
            resourceId: admitted.id,
            resourceLabel: `${cleanFirst} ${cleanLast}`,
            commission: 'orga',
            before: { last_name: admitted.last_name, first_name: admitted.first_name },
            after: { last_name: cleanLast, first_name: cleanFirst },
          });
        }
      }
    }

    const assignedRoomId = await autoAssignRoom(dut1Id, gender, department, req.user.id);

    const record = await db.get('SELECT * FROM dut1_records WHERE id = $1', [dut1Id]);
    const room = assignedRoomId ? await db.get('SELECT * FROM rooms WHERE id = $1', [assignedRoomId]) : null;

    await auditService.logAction(req, {
      action: 'dut1.create',
      resourceType: 'dut1_record',
      resourceId: dut1Id,
      resourceLabel: `${firstName} ${lastName}`,
      commission: 'orga',
      after: record,
    });

    cache.invalidate('/api/stats');

    res.status(201).json({
      record: serializeRecord(record),
      roomAssigned: !!assignedRoomId,
      room,
      repaired,
      warning: assignedRoomId ? null : 'Aucune chambre disponible pour ce genre pour le moment.',
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Un dossier avec ce numéro étudiant existe déjà.' });
    }
    throw err;
  }
}

function buildRecordsFilter(query) {
  const { department, gender, hasRoom, hasLuggagePhoto, complementary, search, createdBy, roomId } = query;

  const clauses = [];
  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (department) clauses.push(`d.department = ${addParam(department)}`);
  if (gender) clauses.push(`d.gender = ${addParam(gender)}`);
  if (createdBy) clauses.push(`d.created_by = ${addParam(Number(createdBy))}`);
  if (roomId) clauses.push(`d.room_id = ${addParam(Number(roomId))}`);
  if (hasRoom === 'true') clauses.push('d.room_id IS NOT NULL');
  if (hasRoom === 'false') clauses.push('d.room_id IS NULL');
  if (complementary === 'true') clauses.push('d.complementary_completed_at IS NOT NULL');
  if (complementary === 'false') clauses.push('d.complementary_completed_at IS NULL');
  if (hasLuggagePhoto === 'true') {
    clauses.push('EXISTS (SELECT 1 FROM luggage_items li WHERE li.dut1_id = d.id)');
  }
  if (hasLuggagePhoto === 'false') {
    clauses.push('NOT EXISTS (SELECT 1 FROM luggage_items li WHERE li.dut1_id = d.id)');
  }
  if (search) {
    const p = addParam(`%${search}%`);
    clauses.push(
      `(d.last_name ILIKE ${p} OR d.first_name ILIKE ${p} OR d.student_number ILIKE ${p} OR d.phone_number ILIKE ${p} OR d.emergency_contacts_json ILIKE ${p})`
    );
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { whereSql, params };
}

async function listRecords(req, res) {
  const { page = 1, pageSize = 25 } = req.query;
  const { whereSql, params } = buildRecordsFilter(req.query);
  const limit = Math.min(Number(pageSize) || 25, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  // Le total et la page tiennent dans une seule requête : `COUNT(*) OVER ()` est
  // évalué sur le filtre complet, avant `LIMIT`, donc un seul aller-retour
  // Supabase au lieu de deux. Quand la page demandée est au-delà du dernier
  // dossier, la fenêtre ne renvoie aucune ligne : on retombe alors sur un COUNT
  // simple, uniquement dans ce cas rare.
  const rows = await db.all(
    `SELECT d.*, r.label AS room_label,
       ${LUGGAGE_ITEMS_COUNT_SUBQUERY},
       ${LUGGAGE_SENSITIVE_SUBQUERY},
       ${ALLERGENS_SUBQUERY},
       ${APTITUDE_LEVELS_SUBQUERY},
       COUNT(*) OVER () AS total_count
     FROM dut1_records d
     LEFT JOIN rooms r ON r.id = d.room_id
     ${whereSql}
     ORDER BY d.created_at DESC, d.id DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const total = rows.length
    ? Number(rows[0].total_count)
    : (await db.get(`SELECT COUNT(*) AS n FROM dut1_records d ${whereSql}`, params)).n;

  const serialized = rows.map(({ total_count: _total, ...record }) => serializeRecord(record));
  res.json({
    records: NON_MEDICAL_ROLES.includes(req.user.role) ? serialized.map(stripMedicalFields) : serialized,
    total,
    page: Number(page) || 1,
    pageSize: limit,
  });
}

const CSV_HEADER = [
  'ID', 'N° étudiant', 'Nom', 'Prénom', 'Naissance', 'Lieu', 'Genre', 'Téléphone',
  'Département', "Contacts d'urgence", 'Adresse', 'Chambre',
  'Bagages déclarés', 'Médical',
];

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function formatEmergencyContacts(json) {
  return parseEmergencyContacts(json)
    .map((c) => [c.name, c.phone].filter(Boolean).join(' : '))
    .filter(Boolean)
    .join('; ');
}

async function exportRecordsCsv(req, res) {
  const { whereSql, params } = buildRecordsFilter(req.query);

  const records = await db.all(
    `SELECT d.id, d.student_number, d.last_name, d.first_name, d.birth_date, d.birth_place,
            d.gender, d.phone_number, d.department, d.emergency_contacts_json,
            d.address, r.label AS room_label,
            d.luggage_count, d.complementary_completed_at
     FROM dut1_records d
     LEFT JOIN rooms r ON r.id = d.room_id
     ${whereSql}
     ORDER BY d.last_name, d.first_name`,
    params
  );

  const csvRows = records.map((r) => [
    r.id, r.student_number, r.last_name, r.first_name, r.birth_date, r.birth_place, r.gender,
    r.phone_number, r.department, formatEmergencyContacts(r.emergency_contacts_json),
    r.address, r.room_label, r.luggage_count, r.complementary_completed_at ? 'Oui' : 'Non',
  ]);
  const csv = [CSV_HEADER, ...csvRows].map((row) => row.map(csvEscape).join(',')).join('\r\n');

  await auditService.logAction(req, {
    action: 'dut1.export_csv',
    resourceType: 'dut1_record',
    resourceLabel: `${records.length} dossiers exportés`,
    commission: 'it',
    after: { count: records.length, filters: req.query },
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="dut1_export.csv"');
  res.send('﻿' + csv);
}

const CONTACTS_CSV_HEADER = ['Nom', 'Prénom', 'Département', 'Téléphone'];

async function exportContactsCsv(req, res) {
  const { whereSql, params } = buildRecordsFilter(req.query);

  const records = await db.all(
    `SELECT d.last_name, d.first_name, d.department, d.phone_number
     FROM dut1_records d
     ${whereSql}
     ORDER BY d.last_name, d.first_name`,
    params
  );

  const csvRows = records.map((r) => [
    r.last_name, r.first_name, DEPARTMENT_LABELS[r.department] || r.department, r.phone_number,
  ]);
  const csv = [CONTACTS_CSV_HEADER, ...csvRows].map((row) => row.map(csvEscape).join(',')).join('\r\n');

  await auditService.logAction(req, {
    action: 'dut1.export_contacts_csv',
    resourceType: 'dut1_record',
    resourceLabel: `${records.length} contacts exportés`,
    commission: 'it',
    after: { count: records.length, filters: req.query },
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="dut1_contacts.csv"');
  res.send('﻿' + csv);
}

async function getRecord(req, res) {
  // Les rôles non médicaux ne reçoivent pas les bagages : inutile d'aller les
  // chercher. Pour les autres, dossier et bagages partent en parallèle.
  const wantsLuggage = !NON_MEDICAL_ROLES.includes(req.user.role);
  const [record, luggageItems] = await Promise.all([
    db.get(
      `SELECT d.*, r.label AS room_label,
       ${LUGGAGE_ITEMS_COUNT_SUBQUERY},
       ${LUGGAGE_SENSITIVE_SUBQUERY},
       ${ALLERGENS_SUBQUERY},
       ${APTITUDE_LEVELS_SUBQUERY}
     FROM dut1_records d
     LEFT JOIN rooms r ON r.id = d.room_id
     WHERE d.id = $1`,
      [req.params.id]
    ),
    wantsLuggage
      ? db.all(
          'SELECT id, file_path, original_name, is_sensitive, sensitive_note, uploaded_at FROM luggage_items WHERE dut1_id = $1',
          [req.params.id]
        )
      : Promise.resolve([]),
  ]);

  if (!record) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  if (!wantsLuggage) {
    return res.json({ record: stripMedicalFields(serializeRecord(record)), luggageItems: [] });
  }

  res.json({ record: serializeRecord(record), luggageItems });
}

async function updateRecord(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM dut1_records WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  const fields = [
    'student_number', 'last_name', 'first_name', 'birth_date', 'birth_place', 'gender',
    'phone_number', 'department', 'address',
  ];
  const bodyKeyMap = {
    student_number: 'studentNumber', last_name: 'lastName', first_name: 'firstName',
    birth_date: 'birthDate', birth_place: 'birthPlace', gender: 'gender',
    phone_number: 'phoneNumber', department: 'department', address: 'address',
  };

  const updated = { ...existing };
  for (const col of fields) {
    const bodyKey = bodyKeyMap[col];
    if (req.body[bodyKey] !== undefined) {
      updated[col] = req.body[bodyKey];
    }
  }
  if (req.body.emergencyContacts !== undefined) {
    const contacts = normalizeEmergencyContacts(req.body.emergencyContacts);
    if (!contacts || !contacts.some((c) => c.phone)) {
      return res.status(400).json({ error: "Au moins un numéro à contacter en cas d'urgence est requis." });
    }
    updated.emergency_contacts_json = JSON.stringify(contacts);
  }

  if (updated.gender && !['M', 'F'].includes(updated.gender)) {
    return res.status(400).json({ error: 'gender doit être M ou F.' });
  }
  if (updated.department && !DEPARTMENTS.includes(updated.department)) {
    return res.status(400).json({ error: `department doit être l'un de : ${DEPARTMENTS.join(', ')}.` });
  }
  const mergedContacts = parseEmergencyContacts(updated.emergency_contacts_json);
  // Dossiers antérieurs aux contacts d'urgence (père/mère en colonnes) :
  // grand-fathered tant qu'ils n'ont pas été re-sauvegardés depuis l'écran,
  // qui pré-remplit les contacts depuis père/mère et impose la saisie.
  const hasLegacyParentPhone = !!(updated.father_phone || updated.mother_phone);
  if (!mergedContacts.some((c) => c.phone) && !hasLegacyParentPhone) {
    return res.status(400).json({ error: "Au moins un numéro à contacter en cas d'urgence est requis." });
  }

  await db.run(
    `UPDATE dut1_records SET
      student_number = $1, last_name = $2, first_name = $3,
      birth_date = $4, birth_place = $5, gender = $6,
      phone_number = $7, department = $8,
      emergency_contacts_json = $9,
      address = $10, updated_by = $11, updated_at = NOW()
     WHERE id = $12`,
    [
      updated.student_number, updated.last_name, updated.first_name,
      updated.birth_date, updated.birth_place, updated.gender,
      updated.phone_number, updated.department,
      updated.emergency_contacts_json ?? existing.emergency_contacts_json ?? null,
      updated.address, req.user.id, id,
    ]
  );

  const record = await db.get('SELECT * FROM dut1_records WHERE id = $1', [id]);

  await auditService.logAction(req, {
    action: 'dut1.update',
    resourceType: 'dut1_record',
    resourceId: id,
    resourceLabel: `${record.first_name} ${record.last_name}`,
    commission: 'it',
    before: existing,
    after: record,
  });

  cache.invalidate('/api/stats');

  res.json({ record: serializeRecord(record) });
}

async function deleteRecord(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM dut1_records WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  // Un agent Orga ne peut supprimer que le dossier qu'il a lui-même
  // enregistré (droit à l'erreur pour recommencer une saisie), et seulement
  // tant qu'aucune autre commission n'a construit dessus : au-delà (phase 2
  // Santé, bagages photographiés, allergies, restriction de santé déclarée),
  // le DUT1 est devenu une dépendance d'un autre travail et seul IT peut
  // trancher, pour ne jamais effacer le travail d'une autre commission à son
  // insu.
  const dependents = await db.get(
    `SELECT
       (SELECT COUNT(*) FROM luggage_items WHERE dut1_id = $1) AS luggage,
       (SELECT COUNT(*) FROM dut1_allergens WHERE dut1_id = $1) AS allergens,
       (SELECT COUNT(*) FROM health_restrictions WHERE dut1_id = $1) AS restrictions`,
    [id]
  );
  const impact = {
    complementaryCompleted: existing.complementary_completed_at !== null,
    luggageCount: Number(dependents.luggage),
    allergensCount: Number(dependents.allergens),
    restrictionsCount: Number(dependents.restrictions),
  };
  const hasDependents =
    impact.complementaryCompleted || impact.luggageCount > 0 || impact.allergensCount > 0 || impact.restrictionsCount > 0;

  if (req.user.role === 'orga') {
    if (existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que les dossiers que vous avez vous-même enregistrés.' });
    }
    if (hasDependents) {
      return res.status(409).json({
        error:
          "Ce dossier a déjà été complété par une autre commission (dossier médical Santé, bagages, allergies ou suivi santé) : il ne peut plus être supprimé que par la commission IT.",
      });
    }
  } else if (hasDependents && req.query.confirm !== 'true') {
    // IT garde le dernier mot, mais pas sans le savoir : supprimer ce dossier
    // effacerait aussi le travail d'une autre commission construit dessus
    // (cascade sur luggage_items/dut1_allergens/health_restrictions), donc on
    // exige une confirmation explicite (?confirm=true) plutôt qu'une
    // suppression silencieuse — même schéma que confirmDuplicate côté
    // création.
    return res.status(409).json({
      error: "Ce dossier contient des données d'autres commissions qui seront perdues définitivement.",
      requiresConfirmation: true,
      impact,
    });
  }

  // Nettoyage des fichiers Supabase Storage avant la suppression en cascade :
  // la cascade DB supprime les lignes luggage_items mais pas les fichiers
  // physiques dans le bucket. On best-effort (une erreur de storage ne doit
  // pas bloquer la suppression du dossier).
  const luggageFiles = await db.all('SELECT file_path FROM luggage_items WHERE dut1_id = $1 AND file_path IS NOT NULL', [id]);
  for (const { file_path } of luggageFiles) {
    try {
      await storage.deleteLuggagePhoto(file_path);
    } catch {
      // Log mais ne bloque pas — le fichier orphelin sera nettoyé manuellement si besoin.
    }
  }

  await db.run('DELETE FROM dut1_records WHERE id = $1', [id]);

  const resourceLabel = `${existing.first_name} ${existing.last_name}`;
  // Suppression en cascade sur luggage_items/dut1_allergens/health_restrictions/
  // room_assignment_history : Orga (le dossier disparaît de son registre) et
  // Santé (l'historique médical du dossier disparaît aussi) perdent chacun de
  // la visibilité, d'où une ligne d'audit par commission concernée.
  await auditService.logAction(req, {
    action: 'dut1.delete',
    resourceType: 'dut1_record',
    resourceId: id,
    resourceLabel,
    commission: 'orga',
    before: existing,
  });
  await auditService.logAction(req, {
    action: 'dut1.delete',
    resourceType: 'dut1_record',
    resourceId: id,
    resourceLabel,
    commission: 'sante',
    before: existing,
  });

  cache.invalidate('/api/stats');

  res.status(204).send();
}

async function listWithoutLuggage(req, res) {
  const records = await db.all(
    `SELECT d.*, r.label AS room_label,
       ${LUGGAGE_ITEMS_COUNT_SUBQUERY},
       ${LUGGAGE_SENSITIVE_SUBQUERY}
     FROM dut1_records d
     LEFT JOIN rooms r ON r.id = d.room_id
     WHERE d.luggage_count IS NULL
        OR (SELECT COUNT(*) FROM luggage_items li WHERE li.dut1_id = d.id) < d.luggage_count
     ORDER BY d.created_at ASC, d.id ASC`
  );
  res.json({ records: records.map(serializeRecord) });
}

// Sous-rôle Orga "logistique" : DUT1 dont la chambre est assignée et les
// bagages entièrement photographiés (même condition que listWithoutLuggage,
// inversée) mais pas encore pris en charge par un agent pour le transport.
// luggage_count > 0 exclut les DUT1 sans bagage déclaré, qui n'ont rien à
// transporter. Dès qu'un agent prend ce DUT1 en charge (confirmLuggagePickup),
// il disparaît de cette liste — cf. listPickedUpPendingDelivery pour la suite
// du parcours (transport en cours, avant livraison).
async function listPendingDelivery(req, res) {
  const records = await db.all(
    `SELECT d.*, r.label AS room_label,
       ${LUGGAGE_ITEMS_COUNT_SUBQUERY},
       ${LUGGAGE_SENSITIVE_SUBQUERY}
     FROM dut1_records d
     LEFT JOIN rooms r ON r.id = d.room_id
     WHERE d.room_id IS NOT NULL
       AND d.luggage_picked_up_at IS NULL
       AND d.luggage_count IS NOT NULL
       AND d.luggage_count > 0
       AND (SELECT COUNT(*) FROM luggage_items li WHERE li.dut1_id = d.id) >= d.luggage_count
     ORDER BY r.label ASC, d.last_name ASC`
  );
  res.json({ records: records.map(serializeRecord) });
}

// DUT1 déjà pris en charge par un agent (parti vers la chambre) mais pas
// encore livré : c'est la liste de travail de l'agent en cours de transport,
// distincte de listPendingDelivery (pas encore pris en charge par personne).
async function listPickedUpPendingDelivery(req, res) {
  const records = await db.all(
    `SELECT d.*, r.label AS room_label, u.full_name AS luggage_picked_up_by_name,
       ${LUGGAGE_ITEMS_COUNT_SUBQUERY},
       ${LUGGAGE_SENSITIVE_SUBQUERY}
     FROM dut1_records d
     LEFT JOIN rooms r ON r.id = d.room_id
     LEFT JOIN users u ON u.id = d.luggage_picked_up_by
     WHERE d.luggage_picked_up_at IS NOT NULL
       AND d.luggage_delivered_at IS NULL
     ORDER BY d.luggage_picked_up_at ASC`
  );
  res.json({ records: records.map(serializeRecord) });
}

async function confirmLuggagePickup(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM dut1_records WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }
  if (!existing.room_id) {
    return res.status(409).json({ error: "Ce DUT1 n'a pas encore de chambre assignée." });
  }
  if (existing.luggage_picked_up_at) {
    return res.status(409).json({ error: 'La prise en charge des bagages a déjà été confirmée pour ce DUT1.' });
  }
  const itemsCount = Number(
    (await db.get('SELECT COUNT(*) AS n FROM luggage_items WHERE dut1_id = $1', [id])).n
  );
  if (itemsCount === 0) {
    return res.status(409).json({ error: 'Aucun bagage enregistré pour ce DUT1.' });
  }

  await db.run(
    `UPDATE dut1_records SET luggage_picked_up_at = NOW(), luggage_picked_up_by = $1, updated_at = NOW() WHERE id = $2`,
    [req.user.id, id]
  );

  const record = await db.get(
    `SELECT d.*, r.label AS room_label FROM dut1_records d LEFT JOIN rooms r ON r.id = d.room_id WHERE d.id = $1`,
    [id]
  );

  await auditService.logAction(req, {
    action: 'dut1.confirm_luggage_pickup',
    resourceType: 'dut1_record',
    resourceId: id,
    resourceLabel: `${existing.first_name} ${existing.last_name}`,
    commission: 'orga',
    before: { luggage_picked_up_at: null },
    after: { luggage_picked_up_at: record.luggage_picked_up_at, room_label: record.room_label },
  });

  res.json({ record: serializeRecord(record) });
}

async function confirmLuggageDelivery(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM dut1_records WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }
  if (!existing.room_id) {
    return res.status(409).json({ error: "Ce DUT1 n'a pas encore de chambre assignée." });
  }
  if (!existing.luggage_picked_up_at) {
    return res.status(409).json({ error: "Les bagages de ce DUT1 doivent d'abord être marqués pris en charge." });
  }
  if (existing.luggage_delivered_at) {
    return res.status(409).json({ error: 'Le dépôt des bagages a déjà été confirmé pour ce DUT1.' });
  }

  await db.run(
    `UPDATE dut1_records SET luggage_delivered_at = NOW(), luggage_delivered_by = $1, updated_at = NOW() WHERE id = $2`,
    [req.user.id, id]
  );

  const record = await db.get(
    `SELECT d.*, r.label AS room_label FROM dut1_records d LEFT JOIN rooms r ON r.id = d.room_id WHERE d.id = $1`,
    [id]
  );

  await auditService.logAction(req, {
    action: 'dut1.confirm_luggage_delivery',
    resourceType: 'dut1_record',
    resourceId: id,
    resourceLabel: `${existing.first_name} ${existing.last_name}`,
    commission: 'orga',
    before: { luggage_delivered_at: null },
    after: { luggage_delivered_at: record.luggage_delivered_at, room_label: record.room_label },
  });

  res.json({ record: serializeRecord(record) });
}

async function listMyDeliveries(req, res) {
  const records = await db.all(
    `SELECT d.id, d.first_name, d.last_name, d.department, d.luggage_delivered_at, r.label AS room_label
     FROM dut1_records d
     LEFT JOIN rooms r ON r.id = d.room_id
     WHERE d.luggage_delivered_by = $1
     ORDER BY d.luggage_delivered_at DESC
     LIMIT 100`,
    [req.user.id]
  );
  res.json({ records });
}

async function listWithoutComplementary(req, res) {
  const records = await db.all(
    `SELECT d.*, ${ALLERGENS_SUBQUERY}, ${APTITUDE_LEVELS_SUBQUERY}
     FROM dut1_records d
     WHERE d.complementary_completed_at IS NULL
     ORDER BY d.created_at ASC, d.id ASC`
  );
  res.json({ records: records.map(serializeRecord) });
}

async function completeComplementary(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT * FROM dut1_records WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }
  const isCorrection = !!existing.complementary_completed_at;
  // Un dossier déjà complété est verrouillé pour l'agent qui l'a rempli — un
  // DUT1 ne dit pas toujours tout dès le premier passage (oubli, mensonge…) —
  // mais reste corrigible par le chef de commission après coup.
  if (isCorrection && !req.user.isCommissionLead) {
    return res.status(409).json({ error: 'Ce dossier a déjà été complété et ne peut plus être modifié depuis cette page.' });
  }
  // La phase 2 peut être désactivée par IT une fois la saisie du jour
  // terminée (cf. requireFeatureEnabled sur la création d'enregistrement) —
  // mais une correction par le chef, potentiellement bien après coup, n'a pas
  // à en dépendre : seule la toute première complétion respecte l'interrupteur.
  if (!isCorrection && !(await getSetting('phase2'))) {
    return res.status(403).json({ error: 'Le dossier médical est désactivé pour cette édition.' });
  }

  const extraFields = req.body.extraFields || {};
  const { onTreatment } = req.body;
  if (typeof onTreatment !== 'boolean') {
    return res.status(400).json({ error: 'La réponse à la question du traitement médical en cours (oui/non) est requise.' });
  }

  // Lien direct phase 2 => Traitements : répondre "Oui" oblige désormais à
  // décrire CHAQUE traitement de façon structurée (médicament du stock ou
  // libellé libre, posologie, créneaux, dates) — un DUT1 peut en suivre
  // plusieurs. À la confirmation, la liste est synchronisée dans
  // dut1_treatments : créés/mis à jour immédiatement (prises du jour à jour),
  // ceux retirés de la déclaration sont clôturés — sans jamais toucher aux
  // traitements créés à la main depuis la page Traitements.
  let declaredTreatments = [];
  if (onTreatment) {
    const list = Array.isArray(req.body.treatments) ? req.body.treatments : null;
    if (!list || list.length === 0) {
      return res.status(400).json({ error: 'Décrivez au moins un traitement en cours.' });
    }

    const seenIds = new Set();
    for (const item of list) {
      if (!item || typeof item !== 'object') {
        return res.status(400).json({ error: 'Traitement invalide.' });
      }
      const payload = {
        dut1Id: Number(id),
        medicationId: item.medicationId || null,
        medicationLabel: (item.medicationLabel || '').trim(),
        dosage: (item.dosage || '').trim(),
        slots: {
          matin: !!(item.slots || {}).matin,
          midi: !!(item.slots || {}).midi,
          soir: !!(item.slots || {}).soir,
        },
        startDate: item.startDate,
        endDate: item.endDate || null,
        notes: (item.notes || '').trim(),
      };
      // Mêmes règles que la page Traitements (dates, créneaux, médicament).
      const treatmentError = await validateTreatmentPayload(payload);
      if (treatmentError) {
        return res.status(400).json({ error: treatmentError });
      }
      // Un id présent = mise à jour du traitement déclaré correspondant ;
      // il doit bien exister, appartenir au dossier, être ouvert et être une
      // déclaration phase 2 (jamais un traitement créé à la main).
      if (item.id) {
        payload.id = Number(item.id);
        const linked = await db.get(
          'SELECT id FROM dut1_treatments WHERE id = $1 AND dut1_id = $2 AND source_phase2 = TRUE AND ended_at IS NULL',
          [payload.id, id]
        );
        if (!linked) {
          return res.status(400).json({ error: 'Un des traitements déclarés est introuvable ou déjà clôturé.' });
        }
        if (seenIds.has(payload.id)) {
          return res.status(400).json({ error: 'Chaque traitement déclaré doit être distinct.' });
        }
        seenIds.add(payload.id);
      }
      declaredTreatments.push(payload);
    }
  }

  // traitement_medical/allergies/aptitude ont leur propre validation (ci-dessus,
  // ou côté frontend pour aptitude via setAptitudeLevels) — leur réponse vit
  // dans des colonnes/tables dédiées, pas dans extraFields, donc ce contrôle
  // générique ne les concerne pas.
  const requiredQuestions = await db.all(
    `SELECT field_key, label FROM phase2_questions
     WHERE required = TRUE AND type NOT IN ('traitement_medical','allergies','aptitude')`
  );
  for (const q of requiredQuestions) {
    const val = extraFields[q.field_key];
    const empty =
      val === undefined ||
      val === null ||
      (typeof val === 'string' && !val.trim()) ||
      (Array.isArray(val) && val.length === 0);
    if (empty) {
      return res.status(400).json({ error: `La question "${q.label}" est requise.` });
    }
  }

  // Résumés lisibles pour la colonne historique treatment_details
  // (annuaire/exports), agrégés comme dans le suivi santé : "A + B".
  for (const payload of declaredTreatments) {
    let medicationName = null;
    if (payload.medicationId) {
      const medication = await db.get('SELECT name FROM medications WHERE id = $1', [payload.medicationId]);
      medicationName = medication ? medication.name : null;
    }
    payload.detailsSummary = [medicationName || payload.medicationLabel, payload.dosage].filter(Boolean).join(' — ');
  }
  const detailsSummary = declaredTreatments.map((t) => t.detailsSummary).join(' + ');

  // Tout en une transaction : le dossier et ses traitements "déclaration"
  // doivent rester cohérents entre eux.
  const { record, treatmentChanges } = await db.transaction(async (client) => {
    await client.run(
      `UPDATE dut1_records
       SET extra_fields_json = $1,
           complementary_completed_at = COALESCE(complementary_completed_at, NOW()),
           complementary_completed_by = COALESCE(complementary_completed_by, $2),
           updated_by = $2,
           updated_at = NOW(),
           on_treatment = $4,
           treatment_details = $5
       WHERE id = $3`,
      [JSON.stringify(extraFields), req.user.id, id, onTreatment, onTreatment ? detailsSummary : null]
    );

    // Correction vers "Non" : plus rien déclaré, on clôture tous les
    // traitements issus d'une déclaration phase 2 encore ouverts — sinon ils
    // continueraient d'apparaître dans les prises du jour alors que le
    // dossier ne déclare plus rien.
    if (!onTreatment) {
      await client.run(
        `UPDATE dut1_treatments SET ended_at = NOW(), ended_by = $1, updated_at = NOW()
         WHERE dut1_id = $2 AND source_phase2 = TRUE AND ended_at IS NULL`,
        [req.user.id, Number(id)]
      );
    }

    const changes = [];
    const keptIds = [];

    for (const payload of declaredTreatments) {
      if (payload.id) {
        await client.run(
          `UPDATE dut1_treatments
           SET medication_id = $1, medication_label = $2, dosage = $3,
               slot_matin = $4, slot_midi = $5, slot_soir = $6,
               start_date = $7, end_date = $8, notes = $9, updated_at = NOW()
           WHERE id = $10`,
          [
            payload.medicationId,
            payload.medicationLabel || null,
            payload.dosage || null,
            payload.slots.matin,
            payload.slots.midi,
            payload.slots.soir,
            payload.startDate,
            payload.endDate,
            payload.notes || null,
            payload.id,
          ]
        );
        changes.push({ action: 'update', id: payload.id });
        keptIds.push(payload.id);
      } else {
        const inserted = await client.run(
          `INSERT INTO dut1_treatments
             (dut1_id, medication_id, medication_label, dosage,
              slot_matin, slot_midi, slot_soir, start_date, end_date, notes,
              created_by, source_phase2)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE)
           RETURNING id`,
          [
            Number(id),
            payload.medicationId,
            payload.medicationLabel || null,
            payload.dosage || null,
            payload.slots.matin,
            payload.slots.midi,
            payload.slots.soir,
            payload.startDate,
            payload.endDate,
            payload.notes || null,
            req.user.id,
          ]
        );
        changes.push({ action: 'create', id: inserted.rows[0].id });
        keptIds.push(inserted.rows[0].id);
      }
    }

    // Les traitements déclarés qui ne figurent plus dans la liste soumise ont
    // été retirés de la déclaration par l'agent : clôture. Les traitements
    // créés à la main (source_phase2 = FALSE) ne sont jamais touchés.
    if (onTreatment && keptIds.length > 0) {
      await client.run(
        `UPDATE dut1_treatments SET ended_at = NOW(), ended_by = $1, updated_at = NOW()
         WHERE dut1_id = $2 AND source_phase2 = TRUE AND ended_at IS NULL AND id <> ALL($3::int[])`,
        [req.user.id, Number(id), keptIds]
      );
    }

    const updated = await client.get('SELECT * FROM dut1_records WHERE id = $1', [id]);
    return { record: updated, treatmentChanges: changes };
  });

  for (const change of treatmentChanges) {
    const actions = { create: 'treatment.create', update: 'treatment.update' };
    await auditService.logAction(req, {
      action: actions[change.action],
      resourceType: 'dut1_treatment',
      resourceId: change.id,
      resourceLabel: `${record.first_name} ${record.last_name}`,
      commission: 'sante',
      after: { dut1_id: Number(id), ...change },
    });
  }

  await auditService.logAction(req, {
    action: isCorrection ? 'dut1.correct_complementary' : 'dut1.complete_complementary',
    resourceType: 'dut1_record',
    resourceId: id,
    resourceLabel: `${record.first_name} ${record.last_name}`,
    commission: 'sante',
    before: existing,
    after: record,
  });

  res.json({ record: serializeRecord(record) });
}

async function getRoomHistory(req, res) {
  const history = await getHistoryForDut1(req.params.id);
  res.json({ history });
}

async function setAllergies(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT id, first_name, last_name FROM dut1_records WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  const allergiesBefore = await db.all(
    'SELECT allergen_id, severity FROM dut1_allergens WHERE dut1_id = $1',
    [id]
  );

  const VALID_SEVERITIES = ['legere', 'moderee', 'severe'];
  const allergies = Array.isArray(req.body.allergies) ? req.body.allergies : [];

  await db.transaction(async (tx) => {
    await tx.run('DELETE FROM dut1_allergens WHERE dut1_id = $1', [id]);
    for (const entry of allergies) {
      const allergenId = Number(entry.allergenId);
      if (!allergenId) continue;
      const severity = VALID_SEVERITIES.includes(entry.severity) ? entry.severity : 'moderee';
      await tx.run(
        'INSERT INTO dut1_allergens (dut1_id, allergen_id, severity) VALUES ($1, $2, $3)',
        [id, allergenId, severity]
      );
    }
  });

  const record = await db.get(`SELECT d.*, ${ALLERGENS_SUBQUERY} FROM dut1_records d WHERE d.id = $1`, [id]);

  await auditService.logAction(req, {
    action: 'dut1.set_allergies',
    resourceType: 'dut1_record',
    resourceId: id,
    resourceLabel: `${existing.first_name} ${existing.last_name}`,
    commission: 'sante',
    before: allergiesBefore,
    after: record.allergens_json,
  });

  res.json({ record: serializeRecord(record) });
}

// Profil d'aptitude saisi à l'enregistrement (question intégrée "aptitude",
// obligatoire) : un niveau par critère configuré, remplace l'ensemble comme
// setAllergies remplace l'ensemble des allergies déclarées — pas d'ajout
// incrémental. levels = [{ criterionId, levelId }, ...].
async function setAptitudeLevels(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT id, first_name, last_name FROM dut1_records WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  const before = await db.all('SELECT criterion_id, level_id FROM dut1_aptitude_levels WHERE dut1_id = $1', [id]);
  const levels = Array.isArray(req.body.levels) ? req.body.levels : [];

  try {
    await db.transaction(async (tx) => {
      await tx.run('DELETE FROM dut1_aptitude_levels WHERE dut1_id = $1', [id]);
      for (const entry of levels) {
        const criterionId = Number(entry.criterionId);
        const levelId = Number(entry.levelId);
        if (!criterionId || !levelId) continue;
        await tx.run('INSERT INTO dut1_aptitude_levels (dut1_id, criterion_id, level_id) VALUES ($1, $2, $3)', [
          id,
          criterionId,
          levelId,
        ]);
      }
    });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Critère ou niveau invalide.' });
    }
    throw err;
  }

  const record = await db.get(`SELECT d.*, ${APTITUDE_LEVELS_SUBQUERY} FROM dut1_records d WHERE d.id = $1`, [id]);

  await auditService.logAction(req, {
    action: 'dut1.set_aptitude_levels',
    resourceType: 'dut1_record',
    resourceId: id,
    resourceLabel: `${existing.first_name} ${existing.last_name}`,
    commission: 'sante',
    before,
    after: record.aptitude_levels_json,
  });

  res.json({ record: serializeRecord(record) });
}

module.exports = {
  createRecord,
  listRecords,
  exportRecordsCsv,
  exportContactsCsv,
  getRecord,
  updateRecord,
  deleteRecord,
  listWithoutLuggage,
  listPendingDelivery,
  listPickedUpPendingDelivery,
  confirmLuggagePickup,
  confirmLuggageDelivery,
  listMyDeliveries,
  listWithoutComplementary,
  completeComplementary,
  getRoomHistory,
  setAllergies,
  setAptitudeLevels,
};
