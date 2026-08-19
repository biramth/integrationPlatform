const { Pool, types } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL manquant (chaîne de connexion Postgres Supabase).');
}

// COUNT(*) et autres agrégats renvoient un BIGINT (OID 20), que pg convertit en
// string par défaut pour éviter toute perte de précision. Les volumes de cette
// appli restent largement sous Number.MAX_SAFE_INTEGER : on force un vrai number
// ici pour que les comparaisons numériques (===, >=...) marchent partout sans
// avoir à ajouter Number(...) à chaque site d'appel.
types.setTypeParser(20, (val) => parseInt(val, 10));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function get(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows[0];
}

async function all(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}

async function run(text, params = []) {
  const result = await pool.query(text, params);
  return { changes: result.rowCount, rows: result.rows };
}

// Exécute `fn(client)` dans une transaction (BEGIN/COMMIT/ROLLBACK). `client` expose
// les mêmes get/all/run que le module, mais liés à la connexion réservée de la transaction.
async function transaction(fn) {
  const client = await pool.connect();
  const scoped = {
    get: async (text, params = []) => (await client.query(text, params)).rows[0],
    all: async (text, params = []) => (await client.query(text, params)).rows,
    run: async (text, params = []) => {
      const result = await client.query(text, params);
      return { changes: result.rowCount, rows: result.rows };
    },
  };

  try {
    await client.query('BEGIN');
    const value = await fn(scoped);
    await client.query('COMMIT');
    return value;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, get, all, run, transaction };
