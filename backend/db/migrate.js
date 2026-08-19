const fs = require('fs');
const path = require('path');
const { pool } = require('./database');

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Migration terminée : schéma appliqué.');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
