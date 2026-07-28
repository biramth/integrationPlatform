const db = require('../db/database');
const { DEPARTMENTS } = require('../constants/departments');
const { autoAssignRoom } = require('../services/roomAssignmentService');

const ALLERGENS_SUBQUERY = `(
  SELECT COALESCE(json_group_array(json_object('id', a.id, 'label', a.label)), '[]')
  FROM dut1_allergens da JOIN allergens a ON a.id = da.allergen_id
  WHERE da.dut1_id = d.id
) AS allergens_json`;

function serializeRecord(record) {
  if (!record) return null;
  return {
    ...record,
    extra_fields: record.extra_fields_json ? JSON.parse(record.extra_fields_json) : null,
    allergens: 'allergens_json' in record ? JSON.parse(record.allergens_json) : undefined,
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

function createRecord(req, res) {
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
  } = req.body;

  try {
    const result = db
      .prepare(
        `INSERT INTO dut1_records
          (student_number, last_name, first_name, birth_date, birth_place, gender, phone_number,
           department, father_name, mother_name, father_phone, mother_phone, address, created_by)
         VALUES (@studentNumber, @lastName, @firstName, @birthDate, @birthPlace, @gender, @phoneNumber,
           @department, @fatherName, @motherName, @fatherPhone, @motherPhone, @address, @createdBy)`
      )
      .run({
        studentNumber: studentNumber || null,
        lastName,
        firstName,
        birthDate,
        birthPlace,
        gender,
        phoneNumber: phoneNumber || null,
        department,
        fatherName: fatherName || null,
        motherName: motherName || null,
        fatherPhone: fatherPhone || null,
        motherPhone: motherPhone || null,
        address: address || null,
        createdBy: req.user.id,
      });

    const dut1Id = result.lastInsertRowid;
    const assignedRoomId = autoAssignRoom(dut1Id, gender, req.user.id);

    const record = db.prepare('SELECT * FROM dut1_records WHERE id = ?').get(dut1Id);
    const room = assignedRoomId ? db.prepare('SELECT * FROM rooms WHERE id = ?').get(assignedRoomId) : null;

    res.status(201).json({
      record: serializeRecord(record),
      roomAssigned: !!assignedRoomId,
      room,
      warning: assignedRoomId ? null : 'Aucune chambre disponible pour ce genre pour le moment.',
    });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Un dossier avec ce numéro étudiant existe déjà.' });
    }
    throw err;
  }
}

function listRecords(req, res) {
  const { department, gender, hasRoom, hasLuggagePhoto, complementary, search, createdBy, page = 1, pageSize = 25 } = req.query;

  const clauses = [];
  const params = {};

  if (department) {
    clauses.push('d.department = @department');
    params.department = department;
  }
  if (gender) {
    clauses.push('d.gender = @gender');
    params.gender = gender;
  }
  if (createdBy) {
    clauses.push('d.created_by = @createdBy');
    params.createdBy = Number(createdBy);
  }
  if (hasRoom === 'true') clauses.push('d.room_id IS NOT NULL');
  if (hasRoom === 'false') clauses.push('d.room_id IS NULL');
  if (complementary === 'true') clauses.push('d.complementary_completed_at IS NOT NULL');
  if (complementary === 'false') clauses.push('d.complementary_completed_at IS NULL');
  if (hasLuggagePhoto === 'true') {
    clauses.push('EXISTS (SELECT 1 FROM luggage_photos lp WHERE lp.dut1_id = d.id)');
  }
  if (hasLuggagePhoto === 'false') {
    clauses.push('NOT EXISTS (SELECT 1 FROM luggage_photos lp WHERE lp.dut1_id = d.id)');
  }
  if (search) {
    clauses.push(
      '(d.last_name LIKE @search OR d.first_name LIKE @search OR d.student_number LIKE @search OR d.phone_number LIKE @search)'
    );
    params.search = `%${search}%`;
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = Math.min(Number(pageSize) || 25, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const total = db.prepare(`SELECT COUNT(*) AS n FROM dut1_records d ${whereSql}`).get(params).n;

  const records = db
    .prepare(
      `SELECT d.*, r.label AS room_label,
         EXISTS (SELECT 1 FROM luggage_photos lp WHERE lp.dut1_id = d.id) AS has_luggage_photo,
         ${ALLERGENS_SUBQUERY}
       FROM dut1_records d
       LEFT JOIN rooms r ON r.id = d.room_id
       ${whereSql}
       ORDER BY d.created_at DESC, d.id DESC
       LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit, offset });

  res.json({
    records: records.map(serializeRecord),
    total,
    page: Number(page) || 1,
    pageSize: limit,
  });
}

function getRecord(req, res) {
  const record = db
    .prepare(
      `SELECT d.*, r.label AS room_label, ${ALLERGENS_SUBQUERY}
       FROM dut1_records d
       LEFT JOIN rooms r ON r.id = d.room_id
       WHERE d.id = ?`
    )
    .get(req.params.id);

  if (!record) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  const photos = db
    .prepare('SELECT id, file_path, original_name, uploaded_at FROM luggage_photos WHERE dut1_id = ?')
    .all(req.params.id);

  res.json({ record: serializeRecord(record), photos });
}

function updateRecord(req, res) {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM dut1_records WHERE id = ?').get(id);
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

  db.prepare(
    `UPDATE dut1_records SET
      student_number = @student_number, last_name = @last_name, first_name = @first_name,
      birth_date = @birth_date, birth_place = @birth_place, gender = @gender,
      phone_number = @phone_number, department = @department, father_name = @father_name,
      mother_name = @mother_name, father_phone = @father_phone, mother_phone = @mother_phone,
      address = @address, updated_by = @updated_by, updated_at = datetime('now')
     WHERE id = @id`
  ).run({ ...updated, updated_by: req.user.id, id });

  const record = db.prepare('SELECT * FROM dut1_records WHERE id = ?').get(id);
  res.json({ record: serializeRecord(record) });
}

function deleteRecord(req, res) {
  const result = db.prepare('DELETE FROM dut1_records WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }
  res.status(204).send();
}

function listWithoutLuggage(req, res) {
  const records = db
    .prepare(
      `SELECT d.*, r.label AS room_label
       FROM dut1_records d
       LEFT JOIN rooms r ON r.id = d.room_id
       WHERE NOT EXISTS (SELECT 1 FROM luggage_photos lp WHERE lp.dut1_id = d.id)
       ORDER BY d.created_at ASC, d.id ASC`
    )
    .all();
  res.json({ records: records.map(serializeRecord) });
}

function listWithoutComplementary(req, res) {
  const records = db
    .prepare(
      `SELECT d.*, ${ALLERGENS_SUBQUERY}
       FROM dut1_records d
       WHERE d.complementary_completed_at IS NULL
       ORDER BY d.created_at ASC, d.id ASC`
    )
    .all();
  res.json({ records: records.map(serializeRecord) });
}

function completeComplementary(req, res) {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM dut1_records WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  const extraFields = req.body.extraFields || {};

  db.prepare(
    `UPDATE dut1_records
     SET extra_fields_json = @extraFieldsJson,
         complementary_completed_at = datetime('now'),
         complementary_completed_by = @userId,
         updated_by = @userId,
         updated_at = datetime('now')
     WHERE id = @id`
  ).run({ extraFieldsJson: JSON.stringify(extraFields), userId: req.user.id, id });

  const record = db.prepare('SELECT * FROM dut1_records WHERE id = ?').get(id);
  res.json({ record: serializeRecord(record) });
}

const replaceAllergensStmt = {
  clear: db.prepare('DELETE FROM dut1_allergens WHERE dut1_id = ?'),
  insert: db.prepare('INSERT INTO dut1_allergens (dut1_id, allergen_id) VALUES (?, ?)'),
};

const updateAllergies = db.transaction((dut1Id, allergenIds) => {
  replaceAllergensStmt.clear.run(dut1Id);
  for (const allergenId of allergenIds) {
    replaceAllergensStmt.insert.run(dut1Id, allergenId);
  }
});

function setAllergies(req, res) {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM dut1_records WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Dossier introuvable.' });
  }

  const allergenIds = Array.isArray(req.body.allergenIds) ? req.body.allergenIds.map(Number) : [];
  updateAllergies(id, allergenIds);

  const record = db
    .prepare(`SELECT d.*, ${ALLERGENS_SUBQUERY} FROM dut1_records d WHERE d.id = ?`)
    .get(id);
  res.json({ record: serializeRecord(record) });
}

module.exports = {
  createRecord,
  listRecords,
  getRecord,
  updateRecord,
  deleteRecord,
  listWithoutLuggage,
  listWithoutComplementary,
  completeComplementary,
  setAllergies,
};
