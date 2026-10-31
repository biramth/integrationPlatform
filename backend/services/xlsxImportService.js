const ExcelJS = require('exceljs');
const { matchFamilyAlias, matchOptionAlias, resolveDetectedDepartment } = require('../constants/departments');

function cellValue(cell) {
  const v = cell.value;
  if (v == null) return '';
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('');
    if (v.text !== undefined) return v.text;
    if (v.result !== undefined) return v.result;
    return '';
  }
  return v;
}

function cellToText(cell) {
  const v = cellValue(cell);
  if (v instanceof Date) return v.toISOString();
  return String(v ?? '').trim();
}

function cellToDateIso(cell) {
  const v = cellValue(cell);
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === 'string') {
    const trimmed = v.trim();
    const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (dmy) {
      const [, d, mo, y] = dmy;
      const year = y.length === 2 ? `20${y}` : y;
      return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const iso = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
    if (iso) return iso[0];
  }
  if (typeof v === 'number') {
    const epoch = Date.UTC(1899, 11, 30);
    const d = new Date(epoch + v * 86400000);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

function normalizeHeader(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function loadCsvWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  // Check magic bytes: XLSX files start with PK (ZIP), CSV files start with text
  const isXlsx = buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4B; // PK
  
  if (isXlsx) {
    try {
      await workbook.xlsx.load(buffer);
      return workbook;
    } catch (e) {
      throw new Error('Impossible de lire le fichier XLSX.');
    }
  }
  
  // Try CSV
  try {
    const stream = require('stream');
    const readable = new stream.Readable();
    readable.push(buffer);
    readable.push(null);
    await workbook.csv.read(readable);
    return workbook;
  } catch (e) {
    throw new Error('Impossible de lire le fichier. Format attendu : CSV ou XLSX.');
  }
}

function sheetToRows(worksheet) {
  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const cells = [];
    row.eachCell({ includeEmpty: true }, (cell) => cells.push(cell));
    rows.push(cells);
  });
  return rows;
}

function findAdmittedStudentsColumns(headerCells) {
  const map = {};
  headerCells.forEach((cell, idx) => {
    const h = normalizeHeader(cellToText(cell));
    if (!h) return;
    if (map.firstName === undefined && h.includes('prenom')) map.firstName = idx;
    else if (map.lastName === undefined && h === 'nom') map.lastName = idx;
    else if (map.birthDate === undefined && h.includes('naissance') && !h.includes('lieu')) map.birthDate = idx;
    else if (map.birthPlace === undefined && h.includes('lieu') && h.includes('naissance')) map.birthPlace = idx;
    else if (map.rank === undefined && ['#', 'rang', 'n', 'n°'].includes(h)) map.rank = idx;
  });
  return map;
}

const DEFAULT_STUDENT_COLS = { rank: 0, firstName: 1, lastName: 2, birthDate: 3, birthPlace: 4 };

function parseAdmittedStudentsBuffer(buffer) {
  return loadCsvWorkbook(buffer).then((workbook) => {
    const candidates = [];
    let detectedFamily = null;
    let detectedOption = null;
    let unrecognizedRowCount = 0;

    workbook.eachSheet((worksheet) => {
      const sheetHint = /principal/i.test(worksheet.name)
        ? 'principale'
        : /attente/i.test(worksheet.name)
          ? 'attente'
          : null;
      let currentListType = sheetHint;
      let columns = null;

      for (const cells of sheetToRows(worksheet)) {
        const rowText = cells.map((c) => cellToText(c)).join(' ').trim();
        if (!rowText) continue;

        if (!detectedFamily) {
          const found = matchFamilyAlias(rowText);
          if (found) detectedFamily = found;
        }
        if (!detectedOption) {
          const foundOption = matchOptionAlias(rowText);
          if (foundOption) detectedOption = foundOption;
        }

        if (/LISTE\s+PRINCIPALE/i.test(rowText)) {
          currentListType = 'principale';
          continue;
        }
        if (/LISTE\s+D.ATTENTE/i.test(rowText)) {
          currentListType = 'attente';
          continue;
        }

        if (!columns) {
          const maybeHeader = findAdmittedStudentsColumns(cells);
          if (maybeHeader.firstName !== undefined && maybeHeader.lastName !== undefined) {
            columns = maybeHeader;
            continue;
          }
        }

        const cols = columns || DEFAULT_STUDENT_COLS;
        const lastName = cells[cols.lastName] ? cellToText(cells[cols.lastName]) : '';
        const firstName = cells[cols.firstName] ? cellToText(cells[cols.firstName]) : '';
        if (!lastName && !firstName) continue;

        if (!currentListType) {
          unrecognizedRowCount++;
          continue;
        }

        const birthDate = cols.birthDate !== undefined && cells[cols.birthDate] ? cellToDateIso(cells[cols.birthDate]) : null;
        const birthPlace = cols.birthPlace !== undefined && cells[cols.birthPlace] ? cellToText(cells[cols.birthPlace]) : '';
        const rankText = cols.rank !== undefined && cells[cols.rank] ? cellToText(cells[cols.rank]) : '';
        const rank = rankText && Number.isFinite(Number(rankText)) ? Number(rankText) : null;

        candidates.push({ rank, firstName, lastName, birthDate, birthPlace, listType: currentListType });
      }
    });

    return {
      detectedDepartment: resolveDetectedDepartment(detectedFamily, detectedOption),
      candidates,
      unrecognizedRowCount,
    };
  });
}

function findRoomsColumns(headerCells) {
  const map = {};
  headerCells.forEach((cell, idx) => {
    const h = normalizeHeader(cellToText(cell));
    if (!h) return;
    if (map.label === undefined && (h.includes('label') || h.includes('numero') || h.includes('chambre') || ['n', '#'].includes(h))) {
      map.label = idx;
    } else if (map.gender === undefined && (h.includes('genre') || h.includes('sexe'))) {
      map.gender = idx;
    } else if (map.capacity === undefined && h.includes('capacit')) {
      map.capacity = idx;
    } else if (map.building === undefined && (h.includes('batiment') || h.includes('pavillon'))) {
      map.building = idx;
    }
  });
  return map;
}

function normalizeGender(text) {
  const t = normalizeHeader(text);
  if (t.startsWith('m')) return 'M';
  if (t.startsWith('f')) return 'F';
  return null;
}

const DEFAULT_ROOM_COLS = { label: 0, gender: 1, capacity: 2, building: 3 };

function parseRoomsBuffer(buffer) {
  return loadCsvWorkbook(buffer).then((workbook) => {
    const candidates = [];
    let unrecognizedRowCount = 0;

    workbook.eachSheet((worksheet) => {
      let columns = null;

      for (const cells of sheetToRows(worksheet)) {
        const rowText = cells.map((c) => cellToText(c)).join(' ').trim();
        if (!rowText) continue;

        if (!columns) {
          const maybeHeader = findRoomsColumns(cells);
          if (maybeHeader.label !== undefined && maybeHeader.gender !== undefined && maybeHeader.capacity !== undefined) {
            columns = maybeHeader;
            continue;
          }
        }

        const cols = columns || DEFAULT_ROOM_COLS;
        const label = cols.label !== undefined && cells[cols.label] ? cellToText(cells[cols.label]) : '';
        if (!label) continue;

        const genderRaw = cols.gender !== undefined && cells[cols.gender] ? cellToText(cells[cols.gender]) : '';
        const capacityRaw = cols.capacity !== undefined && cells[cols.capacity] ? cellToText(cells[cols.capacity]) : '';
        const building = cols.building !== undefined && cells[cols.building] ? cellToText(cells[cols.building]) : '';

        const gender = normalizeGender(genderRaw);
        const capacity = Number(capacityRaw);
        if (!gender || !Number.isFinite(capacity) || capacity <= 0) {
          unrecognizedRowCount++;
          continue;
        }

        candidates.push({ label, gender, capacity, building: building || null });
      }
    });

    return { candidates, unrecognizedRowCount };
  });
}

// --- Nouveau : parse du CSV Vos coordonnees ---
function findContactsCsvColumns(headerCells) {
  const map = {};
  headerCells.forEach((cell, idx) => {
    const h = normalizeHeader(cellToText(cell));
    if (!h) return;
    if (map.lastName === undefined && h === 'nom') map.lastName = idx;
    else if (map.firstName === undefined && h.includes('prenom')) map.firstName = idx;
    else if (map.gender === undefined && (h.includes('genre') || h.includes('sexe'))) map.gender = idx;
    else if (map.department === undefined && h.includes('departement')) map.department = idx;
    else if (map.phoneNumber === undefined && (h.includes('telephone') && !h.includes('urgence'))) map.phoneNumber = idx;
    else if (map.emergencyName === undefined && (h.includes('urgence') || h.includes('contact') || h.includes('parent'))) map.emergencyName = idx;
    else if (map.emergencyPhone === undefined && (h.includes('telephone') || h.includes('phone') || h.includes('portable'))) map.emergencyPhone = idx;
  });
  return map;
}

const DEFAULT_CONTACTS_COLS = {
  lastName: 1,
  firstName: 2,
  gender: 3,
  department: 4,
  phoneNumber: 5,
  emergencyName: 6,
  emergencyPhone: 7,
};

function parseContactsCsvBuffer(buffer) {
  return loadCsvWorkbook(buffer).then((workbook) => {
    const rows = [];
    workbook.eachSheet((worksheet) => {
      let columns = null;
      for (const cells of sheetToRows(worksheet)) {
        const rowText = cells.map((c) => cellToText(c)).join(' ').trim();
        if (!rowText) continue;

        if (!columns) {
          const maybeHeader = findContactsCsvColumns(cells);
          if (maybeHeader.lastName !== undefined && maybeHeader.firstName !== undefined) {
            columns = maybeHeader;
            continue;
          }
        }

        const cols = columns || DEFAULT_CONTACTS_COLS;
        const lastName = cells[cols.lastName] ? cellToText(cells[cols.lastName]) : '';
        const firstName = cells[cols.firstName] ? cellToText(cells[cols.firstName]) : '';
        const genderRaw = cols.gender !== undefined && cells[cols.gender] ? cellToText(cells[cols.gender]) : '';
        const departmentRaw = cols.department !== undefined && cells[cols.department] ? cellToText(cells[cols.department]) : '';
        const phoneRaw = cols.phoneNumber !== undefined && cells[cols.phoneNumber] ? cellToText(cells[cols.phoneNumber]) : '';
        const emergencyNameRaw = cols.emergencyName !== undefined && cells[cols.emergencyName] ? cellToText(cells[cols.emergencyName]) : '';
        const emergencyPhoneRaw = cols.emergencyPhone !== undefined && cells[cols.emergencyPhone] ? cellToText(cells[cols.emergencyPhone]) : '';

        const gender = genderRaw ? genderRaw.trim() : 'M';
        const department = departmentRaw || 'Gestion';
        const phoneNumber = phoneRaw || null;
        const emergencyContact = emergencyNameRaw || emergencyPhoneRaw
          ? { name: emergencyNameRaw.trim() || null, phone: emergencyPhoneRaw.trim() || null }
          : null;

        if (!lastName && !firstName) continue;

        rows.push({ lastName, firstName, gender, department, phoneNumber, emergencyContact });
      }
    });
    return { rows };
  });
}

module.exports = { parseAdmittedStudentsBuffer, parseRoomsBuffer, parseContactsCsvBuffer };