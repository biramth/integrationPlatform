const db = require('../db/database');

async function search(req, res) {
  const { search = '', department } = req.query;
  const clauses = ['matched_dut1_id IS NULL'];
  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (search.trim()) {
    const p = addParam(`%${search.trim()}%`);
    clauses.push(`(last_name ILIKE ${p} OR first_name ILIKE ${p})`);
  }
  if (department) clauses.push(`department = ${addParam(department)}`);

  const students = await db.all(
    `SELECT * FROM admitted_students WHERE ${clauses.join(' AND ')} ORDER BY last_name, first_name LIMIT 20`,
    params
  );
  res.json({ students });
}

async function match(req, res) {
  const { lastName = '', firstName = '', department } = req.query;
  if (!lastName.trim() || !firstName.trim()) {
    return res.json({ student: null });
  }

  const clauses = ['LOWER(last_name) = LOWER($1)', 'LOWER(first_name) = LOWER($2)'];
  const params = [lastName.trim(), firstName.trim()];
  if (department) {
    params.push(department);
    clauses.push(`department = $${params.length}`);
  }

  const student = await db.get(
    `SELECT * FROM admitted_students WHERE ${clauses.join(' AND ')} ORDER BY id LIMIT 1`,
    params
  );
  res.json({ student: student || null });
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

module.exports = { search, match, progress };
