const db = require('../db/database');
const { DEPARTMENTS, DEPARTMENT_LABELS } = require('../constants/departments');
const { autoAssignRoom, getHistoryForDut1 } = require('../services/roomAssignmentService');

const ALLERGENS_SUBQUERY = `(
  SELECT COALESCE(json_agg(json_build_object('id', a.id, 'label', a.label, 'severity', da.severity)), '[]'::json)
  FROM dut1_allergens da JOIN allergens a ON a.id = da.allergen_id
  WHERE da.dut1_id = d.id
) AS allergens_json`;

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
    allergens: 'allergens_json' in record ? record.allergens_json : undefined,
  };
}

function validateBasicPayload(body) {
  const required = ['lastName', 'firstName', 'birthDate', 'birthPlace', 'gender', 'department'];
  for (const field of required) {
    if (!body[field]) {
      return `Le champ ${field} est requis.`;
    }
  }
  if (!['M', 'F'].includes(body.gender)) {
    return 'gender doit être M ou F.';
  }
  if (!DEPARTMENTS.includes(body.department)) {
    return `department doit être l'un de : ${DEPARTMENTS.join(', ')}.`;
  }
  if (!body.fatherPhone && !body.motherPhone) {
    return 'Au moins un numéro de téléphone parent (fatherPhone ou motherPhone) est requis.';
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
    fatherName,
    motherName,
    fatherPhone,
    motherPhone,
    address,
    admittedStudentId,
  } = req.body;

  try {
    const result = await db.run(
      `INSERT INTO dut1_records
        (student_number, last_name, first_name, birth_date, birth_place, gender, phone_number,
         department, father_name, mother_name, father_phone, mother_phone, address, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
        fatherName || null,
        motherName || null,
        fatherPhone || null,
        motherPhone || null,
        address || null,
        req.user.id,
      ]
    );

    const dut1Id = result.rows[0].id;

    if (admittedStudentId) {
      // Lien best-effort, jamais bloquant : le dossier existe déjà même si ce
      // candidat de l'import a entretemps été relié à un autre dossier.
      await db.run(
        'UPDATE admitted_students SET matched_dut1_id = $1 WHERE id = $2 AND matched_dut1_id IS NULL',
        [dut1Id, Number(admittedStudentId)]
      );
    }

    const assignedRoomId = await autoAssignRoom(dut1Id, gender, req.user.id);

    const record = await db.get('SELECT * FROM dut1_records WHERE id = $1', [dut1Id]);
    const room = assignedRoomId ? await db.get('SELECT * FROM rooms WHERE id = $1', [assignedRoomId]) : null;

    res.status(201).json({
      record: serializeRecord(record),
      roomAssigned: !!assignedRoomId,
      room,
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
      `(d.last_name ILIKE ${p} OR d.first_name ILIKE ${p} OR d.student_number ILIKE ${p} OR d.phone_number ILIKE ${p})`
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

  const total = (await db.get(`SELECT COUNT(*) AS n FROM dut1_records d ${whereSql}`, params)).n;

  const records = await db.all(
    `SELECT d.*, r.label AS room_label,
       ${LUGGAGE_ITEMS_COUNT_SUBQUERY},
       ${LUGGAGE_SENSITIVE_SUBQUERY},
       ${ALLERGENS_SUBQUERY}
     FROM dut1_records d
     LEFT JOIN rooms r ON r.id = d.room_id
     ${whereSql}
     ORDER BY d.created_at DESC, d.id DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  res.json({
    records: records.map(serializeRecord),
    total,
    page: Number(page) || 1,
    pageSize: limit,
  });
}

const CSV_HEADER = [
  'ID', 'N° étudiant', 'Nom', 'Prénom', 'Naissance', 'Lieu', 'Genre', 'Téléphone',
  'Département', 'Père', 'Mère', 'Tél. père', 'Tél. mère', 'Adresse', 'Chambre',
  'Bagages déclarés', 'Phase 2',
];

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

async function exportRecordsCsv(req, res) {
  const { whereSql, params } = buildRecordsFilter(req.query);

  const records = await db.all(
    `SELECT d.id, d.student_number, d.last_name, d.first_name, d.birth_date, d.birth_place,
            d.gender, d.phone_number, d.department, d.father_name, d.mother_name,
            d.father_phone, d.mother_phone, d.address, r.label AS room_label,
            d.luggage_count, d.complementary_completed_at
     FROM dut1_records d
     LEFT JOIN rooms r ON r.id = d.room_id
     ${whereSql}
     ORDER BY d.last_name, d.first_name`,
    params
  );

  const csvRows = records.map((r) => [
    r.id, r.student_number, r.last_name, r.first_name, r.birth_date, r.birth_place, r.gender,
    r.phone_number, r.department, r.father_name, r.mother_name, r.father_phone, r.mother_phone,
    r.address, r.room_label, r.luggage_count, r.complementary_completed_at ? 'Oui' : 'Non',
  ]);
  const csv = [CSV_HEADER, ...csvRows].map((row) => row.map(csvEscape).join(',')).join('\r\n');

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

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="dut1_contacts.csv"');
  res.send('﻿' + csv);
}

async function getRecord(req, res) {
  const record = await db.get(
    `SELECT d.*, r.label AS room_label,
       ${LUGGAGE_ITEMS_COUNT_SUBQUERY},
       ${LUGGAGE_SENSITIVE_SUBQUERY},
       ${ALLERGENS_SUBQUERY}
     FROM dut1_records d
     LEFT JOIN rooms r ON r.id = d.room_id
     WHERE d.id = $1`,
    [req.params.id]
  );

  if (!record) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  const luggageItems = await db.all(
    'SELECT id, file_path, original_name, is_sensitive, sensitive_note, uploaded_at FROM luggage_items WHERE dut1_id = $1',
    [req.params.id]
  );

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
    'phone_number', 'department', 'father_name', 'mother_name', 'father_phone', 'mother_phone', 'address',
  ];
  const bodyKeyMap = {
    student_number: 'studentNumber', last_name: 'lastName', first_name: 'firstName',
    birth_date: 'birthDate', birth_place: 'birthPlace', gender: 'gender',
    phone_number: 'phoneNumber', department: 'department', father_name: 'fatherName',
    mother_name: 'motherName', father_phone: 'fatherPhone', mother_phone: 'motherPhone', address: 'address',
  };

  const updated = { ...existing };
  for (const col of fields) {
    const bodyKey = bodyKeyMap[col];
    if (req.body[bodyKey] !== undefined) {
      updated[col] = req.body[bodyKey];
    }
  }

  if (updated.gender && !['M', 'F'].includes(updated.gender)) {
    return res.status(400).json({ error: 'gender doit être M ou F.' });
  }
  if (updated.department && !DEPARTMENTS.includes(updated.department)) {
    return res.status(400).json({ error: `department doit être l'un de : ${DEPARTMENTS.join(', ')}.` });
  }
  if (!updated.father_phone && !updated.mother_phone) {
    return res.status(400).json({ error: 'Au moins un numéro de téléphone parent est requis.' });
  }
  if (req.body.admissionListType !== undefined && req.body.admissionListType !== null) {
    if (!['principale', 'attente'].includes(req.body.admissionListType)) {
      return res.status(400).json({ error: 'admissionListType doit être "principale" ou "attente".' });
    }
  }

  await db.run(
    `UPDATE dut1_records SET
      student_number = $1, last_name = $2, first_name = $3,
      birth_date = $4, birth_place = $5, gender = $6,
      phone_number = $7, department = $8, father_name = $9,
      mother_name = $10, father_phone = $11, mother_phone = $12,
      address = $13, updated_by = $14, updated_at = NOW()
     WHERE id = $15`,
    [
      updated.student_number, updated.last_name, updated.first_name,
      updated.birth_date, updated.birth_place, updated.gender,
      updated.phone_number, updated.department, updated.father_name,
      updated.mother_name, updated.father_phone, updated.mother_phone,
      updated.address, req.user.id, id,
    ]
  );

  if (req.body.admissionListType !== undefined) {
    const listType = req.body.admissionListType || null;
    if (listType) {
      await db.run(
        `UPDATE dut1_records SET admission_list_type = $1, admission_validated_at = NOW(), admission_validated_by = $2 WHERE id = $3`,
        [listType, req.user.id, id]
      );
    } else {
      await db.run(
        `UPDATE dut1_records SET admission_list_type = NULL, admission_validated_at = NULL, admission_validated_by = NULL WHERE id = $1`,
        [id]
      );
    }
  }

  const record = await db.get('SELECT * FROM dut1_records WHERE id = $1', [id]);
  res.json({ record: serializeRecord(record) });
}

async function deleteRecord(req, res) {
  const result = await db.run('DELETE FROM dut1_records WHERE id = $1', [req.params.id]);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }
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

async function listWithoutComplementary(req, res) {
  const records = await db.all(
    `SELECT d.*, ${ALLERGENS_SUBQUERY}
     FROM dut1_records d
     WHERE d.complementary_completed_at IS NULL
     ORDER BY d.created_at ASC, d.id ASC`
  );
  res.json({ records: records.map(serializeRecord) });
}

async function completeComplementary(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT id, complementary_completed_at FROM dut1_records WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }
  if (existing.complementary_completed_at) {
    return res.status(409).json({ error: 'Ce dossier a déjà été complété et ne peut plus être modifié depuis cette page.' });
  }

  const extraFields = req.body.extraFields || {};
  const { admissionListType, onTreatment, treatmentDetails } = req.body;
  if (admissionListType && !['principale', 'attente'].includes(admissionListType)) {
    return res.status(400).json({ error: 'admissionListType doit être "principale" ou "attente".' });
  }
  if (typeof onTreatment !== 'boolean') {
    return res.status(400).json({ error: 'La question "suis-tu un traitement médical ?" (oui/non) est requise.' });
  }
  if (onTreatment && !treatmentDetails?.trim()) {
    return res.status(400).json({ error: 'Précise quels traitements sont suivis.' });
  }

  await db.run(
    `UPDATE dut1_records
     SET extra_fields_json = $1,
         complementary_completed_at = NOW(),
         complementary_completed_by = $2,
         updated_by = $2,
         updated_at = NOW(),
         on_treatment = $4,
         treatment_details = $5
     WHERE id = $3`,
    [JSON.stringify(extraFields), req.user.id, id, onTreatment, onTreatment ? treatmentDetails.trim() : null]
  );

  if (admissionListType) {
    await db.run(
      `UPDATE dut1_records SET admission_list_type = $1, admission_validated_at = NOW(), admission_validated_by = $2 WHERE id = $3`,
      [admissionListType, req.user.id, id]
    );
  }

  const record = await db.get('SELECT * FROM dut1_records WHERE id = $1', [id]);
  res.json({ record: serializeRecord(record) });
}

async function getRoomHistory(req, res) {
  const history = await getHistoryForDut1(req.params.id);
  res.json({ history });
}

async function setAllergies(req, res) {
  const { id } = req.params;
  const existing = await db.get('SELECT id FROM dut1_records WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

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
  listWithoutComplementary,
  completeComplementary,
  getRoomHistory,
  setAllergies,
};
