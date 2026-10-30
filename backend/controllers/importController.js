const db = require('../db/database');
const { DEPARTMENTS, DEPARTMENT_LABELS } = require('../constants/departments');
const { parseAdmittedStudentsBuffer, parseRoomsBuffer, parseContactsCsvBuffer } = require('../services/xlsxImportService');
const auditService = require('../services/auditService');

function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function previewAdmittedStudents(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier Excel requis (champ "file").' });
  }
  res.json(await parseAdmittedStudentsBuffer(req.file.buffer));
}

async function previewRooms(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier Excel requis (champ "file").' });
  }
  res.json(await parseRoomsBuffer(req.file.buffer));
}

async function previewContactsCsv(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier CSV requis (champ "file").' });
  }
  res.json(await parseContactsCsvBuffer(req.file.buffer));
}

async function confirmAdmittedStudents(req, res) {
  const rows = Array.isArray(req.body.candidates) ? req.body.candidates : [];
  if (rows.length === 0) {
    return res.status(400).json({ error: 'Aucune ligne à importer.' });
  }

  let createdCount = 0;
  await db.transaction(async (tx) => {
    for (const row of rows) {
      if (!row.lastName || !row.firstName || !row.department || !row.listType) continue;
      if (!DEPARTMENTS.includes(row.department)) continue;
      if (!['principale', 'attente'].includes(row.listType)) continue;

      await tx.run(
        `INSERT INTO admitted_students
          (last_name, first_name, birth_date, birth_place, department, rank, list_type, imported_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          row.lastName,
          row.firstName,
          row.birthDate || null,
          row.birthPlace || null,
          row.department,
          row.rank || null,
          row.listType,
          req.user.id,
        ]
      );
      createdCount++;
    }
  });

  await auditService.logAction(req, {
    action: 'admitted_students.import',
    resourceType: 'admitted_students',
    resourceLabel: `${createdCount} candidats importés`,
    commission: 'it',
    after: { createdCount, totalRows: rows.length },
  });

  res.status(201).json({ createdCount });
}

async function confirmRooms(req, res) {
  const rows = Array.isArray(req.body.candidates) ? req.body.candidates : [];
  if (rows.length === 0) {
    return res.status(400).json({ error: 'Aucune ligne à importer.' });
  }

  let createdCount = 0;
  let skippedCount = 0;
  await db.transaction(async (tx) => {
    for (const row of rows) {
      if (!row.label || !['M', 'F'].includes(row.gender) || !row.capacity || Number(row.capacity) <= 0) {
        skippedCount++;
        continue;
      }
      const result = await tx.run(
        `INSERT INTO rooms (label, gender, capacity, building) VALUES ($1, $2, $3, $4)
         ON CONFLICT (label) DO NOTHING`,
        [row.label, row.gender, Number(row.capacity), row.building || null]
      );
      if (result.changes > 0) createdCount++;
      else skippedCount++;
    }
  });

  await auditService.logAction(req, {
    action: 'rooms.import',
    resourceType: 'room',
    resourceLabel: `${createdCount} chambres importées`,
    commission: 'orga',
    after: { createdCount, skippedCount },
  });

  res.status(201).json({ createdCount, skippedCount });
}

async function previewContactsCsv(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier CSV requis (champ "file").' });
  }
  res.json(await parseContactsCsvBuffer(req.file.buffer));
}

// Mappe le nom complet du département (comme dans le CSV) vers le code court
function resolveDepartmentCode(fullName) {
  if (!fullName) return null;
  const normalized = fullName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Correspondance exacte avec les labels
  for (const [code, label] of Object.entries(DEPARTMENT_LABELS)) {
    if (normalizeText(label) === normalized) return code;
  }
  
  // Correspondance partielle (ex: "Genie electrique" -> "GE")
  for (const [code, label] of Object.entries(DEPARTMENT_LABELS)) {
    const normalizedLabel = normalizeText(label);
    if (normalizedLabel.includes(normalized) || normalized.includes(normalizedLabel)) {
      return code;
    }
  }
  
  // Essayer de matcher avec les codes directement
  const upper = fullName.trim().toUpperCase();
  if (DEPARTMENTS.includes(upper)) return upper;
  
  // Correspondance par mots-clés
  if (normalized.includes('gestion')) return 'Gestion';
  if (normalized.includes('genie civil') || normalized === 'gc') return 'GC';
  if (normalized.includes('genie electrique') || normalized === 'ge') return 'GE';
  if (normalized.includes('genie informatique') && normalized.includes('informatique')) return 'INFO';
  if (normalized.includes('genie informatique') && (normalized.includes('telecommunication') || normalized.includes('reseau'))) return 'ITR';
  if (normalized.includes('genie mecanique') || normalized === 'gm') return 'GM';
  if (normalized.includes('industrie alimentaire') || normalized === 'ia') return 'IA';
  if (normalized.includes('biologie appliquee') || normalized === 'ba') return 'BA';
  if (normalized.includes('genie chimique') || normalized === 'gch') return 'GCH';
  if (normalized.includes('biomedical') || normalized.includes('licence biomedical') || normalized === 'gb') return 'GB';
  
  return null;
}

async function confirmContactsCsv(req, res) {
  const rows = Array.isArray(req.body.candidates) ? req.body.candidates : [];
  if (rows.length === 0) {
    return res.status(400).json({ error: 'Aucune ligne à importer.' });
  }

  let createdCount = 0;
  let skippedCount = 0;
  await db.transaction(async (tx) => {
    for (const row of rows) {
      const { lastName, firstName, gender: genderRaw, department: deptRaw, phoneNumber, emergencyContact } = row;

      // Validation minimale
      if (!lastName || !firstName) {
        skippedCount++;
        continue;
      }
      
      // Normaliser le genre
      const gender = (genderRaw || '').trim().toLowerCase().startsWith('m') ? 'M' : 'F';
      
      // Résoudre le code département à partir du nom complet
      const department = resolveDepartmentCode(deptRaw);
      if (!department || !DEPARTMENTS.includes(department)) {
        skippedCount++;
        continue;
      }

      // Essayer de trouver un dossier existant par nom/prénom/department
      const existing = await tx.query(
        `SELECT id, emergency_contacts_json FROM dut1_records WHERE last_name = $1 AND first_name = $2 AND department = $3`,
        [lastName, firstName, department]
      );

      if (existing.rows.length === 0) {
        // Création d'un nouveau dossier
        const result = await tx.run(
          `INSERT INTO dut1_records
            (last_name, first_name, birth_date, birth_place, gender, department, phone_number, emergency_contacts_json, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            lastName,
            firstName,
            null, // birth_date - non fourni dans ce CSV
            null, // birth_place - non fourni
            gender,
            department,
            phoneNumber,
            emergencyContact ? JSON.stringify([emergencyContact]) : null,
            req.user.id,
          ]
        );
        createdCount++;
      } else {
        // Mise à jour du dossier existant - fusionner les contacts d'urgence
        const existingRecord = existing.rows[0];
        let contacts = [];
        if (existingRecord.emergency_contacts_json) {
          try { contacts = JSON.parse(existingRecord.emergency_contacts_json); } catch { contacts = []; }
        }
        // Ajouter le nouveau contact s'il n'est pas déjà présent
        const alreadyExists = contacts.some(c => c.name === emergencyContact.name && c.phone === emergencyContact.phone);
        if (!alreadyExists && emergencyContact.name) {
          contacts.push(emergencyContact);
        }
        await tx.run(
          `UPDATE dut1_records SET emergency_contacts_json = $1 WHERE id = $2`,
          [JSON.stringify(contacts), existingRecord.id]
        );
        createdCount++;
      }
    }
  });

  await auditService.logAction(req, {
    action: 'dut1.import_contacts',
    resourceType: 'dut1_records',
    resourceLabel: `${createdCount} dossiers importés avec contacts d'urgence`,
    commission: 'sante',
    after: { createdCount, totalRows: rows.length },
  });

  res.status(201).json({ createdCount, skippedCount });
}

module.exports = { previewAdmittedStudents, previewRooms, previewContactsCsv, confirmAdmittedStudents, confirmRooms, confirmContactsCsv };
