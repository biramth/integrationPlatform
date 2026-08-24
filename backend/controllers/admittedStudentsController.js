const db = require('../db/database');
const { nameTokensOverlap } = require('../utils/fuzzyNames');

const SEARCH_LIMIT = 20;

async function search(req, res) {
  const searchTerm = String(req.query.search || '').trim();
  const department = req.query.department;

  // Passe exacte : sous-chaîne SQL classique, comme avant.
  const clauses = ['matched_dut1_id IS NULL'];
  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };
  if (department) clauses.push(`department = ${addParam(department)}`);
  if (searchTerm) {
    clauses.push(`(last_name ILIKE ${addParam(`%${searchTerm}%`)} OR first_name ILIKE ${addParam(`%${searchTerm}%`)})`);
  }

  const exactRows = await db.all(
    `SELECT * FROM admitted_students WHERE ${clauses.join(' AND ')} ORDER BY last_name, first_name LIMIT ${SEARCH_LIMIT}`,
    params
  );
  let students = exactRows.map((row) => ({ ...row, matchQuality: 'exact' }));

  // Passe floue : le référentiel contient parfois des noms déformés par la
  // conversion du fichier officiel ("Marne" pour "Mame") — sans cette passe,
  // l'admis serait introuvable à l'enregistrement et jamais associé. Chaque
  // résultat flou porte matchQuality='fuzzy' ; l'UI affiche un rappel de
  // vérification et l'association répare ensuite l'orthographe (cf.
  // dut1Controller.createRecord).
  if (searchTerm.length >= 2 && students.length < SEARCH_LIMIT) {
    const poolClauses = ['matched_dut1_id IS NULL'];
    const poolParams = [];
    if (department) {
      poolParams.push(department);
      poolClauses.push(`department = $1`);
    }
    const pool = await db.all(
      `SELECT * FROM admitted_students WHERE ${poolClauses.join(' AND ')} ORDER BY last_name LIMIT 2000`,
      poolParams
    );
    const exactIds = new Set(students.map((s) => s.id));
    const fuzzy = pool
      .filter((row) => !exactIds.has(row.id))
      .map((row) => ({ row, score: nameTokensOverlap(searchTerm, `${row.first_name} ${row.last_name}`) }))
      .filter((hit) => hit.score !== null)
      .sort(
        (a, b) =>
          a.score - b.score ||
          `${a.row.last_name} ${a.row.first_name}`.localeCompare(`${b.row.last_name} ${b.row.first_name}`)
      )
      .slice(0, SEARCH_LIMIT - students.length)
      .map((hit) => ({ ...hit.row, matchQuality: 'fuzzy' }));
    students = students.concat(fuzzy);
  }

  res.json({ students });
}

async function progress(req, res) {
  const rows = await db.all(
    `SELECT department, list_type,
       COUNT(*) AS total,
       COUNT(matched_dut1_id) AS matched
     FROM admitted_students
     GROUP BY department, list_type
     ORDER BY department, list_type`
  );
  res.json({ progress: rows });
}

module.exports = { search, progress };
