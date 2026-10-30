#!/usr/bin/env node
// Benchmark des requêtes SQL les plus chaudes de l'API — LECTURE SEULE.
//
// Objectif : mesurer le coût réel des requêtes derrière les écrans fréquentés,
// sans passer par HTTP, pour distinguer « le serveur Node est lent » de « la
// base met du temps à répondre ». Le script ouvre un petit pool Postgres dont
// chaque connexion est en READ ONLY par défaut (toute écriture échouerait),
// puis exécute chaque scénario plusieurs fois après échauffement. Le pool est
// nécessaire pour reproduire les « vagues » du code actuel : plusieurs requêtes
// indépendantes lancées en parallèle, comme le fait le contrôleur.
//
// Usage (depuis backend/) :
//   npm run bench:queries
//   npm run bench:queries -- --json > bench.json
//   npm run bench:queries -- --iterations=50 --warmup=5
//   npm run bench:queries -- --detail      # une ligne par requête SQL
//
// La connexion vient de DATABASE_URL (backend/.env) ou de --url=...
// Les valeurs affichées sont des millisecondes côté client (aller-retour inclus).

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const { Pool, types } = require('pg');

// Même conversion que db/database.js : COUNT(*) revient en BIGINT (OID 20),
// pg le rendrait en string.
types.setTypeParser(20, (val) => parseInt(val, 10));

const DEFAULT_ITERATIONS = 30;
const DEFAULT_WARMUP = 3;

function parseArgs(argv) {
  const opts = {
    iterations: DEFAULT_ITERATIONS,
    warmup: DEFAULT_WARMUP,
    detail: false,
    json: false,
    help: false,
    url: null,
    date: new Date().toISOString().slice(0, 10),
  };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--detail') opts.detail = true;
    else if (arg.startsWith('--iterations=')) opts.iterations = Math.max(1, Number(arg.split('=')[1]) || DEFAULT_ITERATIONS);
    else if (arg.startsWith('--warmup=')) opts.warmup = Math.max(0, Number(arg.split('=')[1]) || 0);
    else if (arg.startsWith('--date=')) opts.date = arg.split('=')[1];
    else if (arg.startsWith('--url=')) opts.url = arg.slice('--url='.length);
    else if (!arg.startsWith('-') && !opts.url) opts.url = arg;
    else {
      console.error(`Option inconnue : ${arg}`);
      process.exit(1);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`Benchmark lecture seule des requêtes SQL (Postgres/Supabase)

Usage : npm run bench:queries -- [options]

Options :
  --iterations=N     Mesures par scénario après échauffement (défaut ${DEFAULT_ITERATIONS})
  --warmup=N         Exécutions jetées avant mesure (défaut ${DEFAULT_WARMUP})
  --date=YYYY-MM-DD  Date simulée pour les requêtes « du jour » (défaut aujourd'hui)
  --detail           Mesure aussi chaque requête SQL séparément
  --json             Sortie JSON (pour comparer avant/après)
  --url=URL          Chaîne Postgres (défaut : DATABASE_URL de backend/.env)
  -h, --help         Affiche cette aide

Sécurité : chaque connexion du pool est ouverte en READ ONLY par défaut, aucune
donnée n'est modifiée. Le script ne doit pas être lancé sur une base de
production pendant un import, mais il est sans danger pour les données.
`);
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    n: sorted.length,
    min: sorted[0] ?? 0,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1] ?? 0,
    mean: sorted.length ? sum / sorted.length : 0,
  };
}

function ms(value) {
  return Number(value.toFixed(2));
}

// Un « scénario » = une ou plusieurs VAGUES de requêtes. Une vague est un
// ensemble de requêtes indépendantes lancées en parallèle (comme un
// Promise.all dans un contrôleur) ; les vagues s'enchaînent. Un scénario sans
// `waves` est une suite strictement séquentielle (`statements`).
async function runWaves(db, waves) {
  for (const wave of waves) {
    if (wave.length === 1) await db.query(wave[0].sql, wave[0].params);
    else await Promise.all(wave.map((stmt) => db.query(stmt.sql, stmt.params)));
  }
}

async function measure(db, scenario, opts) {
  const waves = scenario.waves ?? scenario.statements.map((stmt) => [stmt]);

  for (let i = 0; i < opts.warmup; i++) {
    await runWaves(db, waves);
  }

  const samples = [];
  for (let i = 0; i < opts.iterations; i++) {
    const startedAt = performance.now();
    await runWaves(db, waves);
    samples.push(performance.now() - startedAt);
  }

  return {
    name: scenario.name,
    queries: waves.reduce((acc, wave) => acc + wave.length, 0),
    waves: waves.length,
    ...Object.fromEntries(Object.entries(summarize(samples)).map(([k, v]) => [k, k === 'n' ? v : ms(v)])),
  };
}

// ---------------------------------------------------------------------------
// Requêtes : copies fidèles de celles des contrôleurs (au paramètre près).
// ---------------------------------------------------------------------------

const STATS_OVERVIEW_CURRENT = [
  { sql: 'SELECT COUNT(*) AS n FROM dut1_records' },
  { sql: 'SELECT COUNT(*) AS n FROM dut1_records WHERE room_id IS NOT NULL' },
  {
    sql: `SELECT COUNT(*) AS n FROM dut1_records d
          WHERE d.luggage_count IS NOT NULL
            AND (SELECT COUNT(*) FROM luggage_items li WHERE li.dut1_id = d.id) >= d.luggage_count`,
  },
  { sql: 'SELECT COUNT(*) AS n FROM dut1_records WHERE complementary_completed_at IS NOT NULL' },
  { sql: 'SELECT COUNT(*) AS n FROM health_restrictions WHERE resolved_at IS NULL' },
];

const STATS_OVERVIEW_CONSOLIDATED = [
  {
    sql: `SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE d.room_id IS NOT NULL) AS with_room,
            COUNT(*) FILTER (
              WHERE d.luggage_count IS NOT NULL
                AND (SELECT COUNT(*) FROM luggage_items li WHERE li.dut1_id = d.id) >= d.luggage_count
            ) AS with_luggage,
            COUNT(*) FILTER (WHERE d.complementary_completed_at IS NOT NULL) AS complementary_done,
            (SELECT COUNT(*) FROM health_restrictions WHERE resolved_at IS NULL) AS active_restrictions
          FROM dut1_records d`,
  },
];

const HEALTH_OVERVIEW_CURRENT = [
  { sql: 'SELECT COUNT(*) AS n FROM dut1_records' },
  { sql: 'SELECT COUNT(*) AS n FROM dut1_records WHERE complementary_completed_at IS NOT NULL' },
  { sql: 'SELECT COUNT(*) AS n FROM health_restrictions WHERE resolved_at IS NULL' },
  { sql: 'SELECT COUNT(*) AS n FROM dut1_records WHERE on_treatment = TRUE' },
  { sql: 'SELECT COUNT(DISTINCT dut1_id) AS n FROM dut1_allergens' },
  { sql: 'SELECT COUNT(*) AS n FROM allergens' },
  {
    sql: `SELECT COUNT(*) AS n FROM dut1_treatments
          WHERE start_date <= CURRENT_DATE
            AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
  },
];

const HEALTH_OVERVIEW_CONSOLIDATED = [
  {
    sql: `SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE d.complementary_completed_at IS NOT NULL) AS complementary_done,
            (SELECT COUNT(*) FROM health_restrictions WHERE resolved_at IS NULL) AS active_restrictions,
            COUNT(*) FILTER (WHERE d.on_treatment = TRUE) AS on_treatment,
            (SELECT COUNT(DISTINCT dut1_id) FROM dut1_allergens) AS with_allergies,
            (SELECT COUNT(*) FROM allergens) AS total_allergens,
            (SELECT COUNT(*) FROM dut1_treatments
              WHERE start_date <= CURRENT_DATE
                AND (end_date IS NULL OR end_date >= CURRENT_DATE)) AS active_treatments
          FROM dut1_records d`,
  },
];

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

const DUT1_LIST_SQL = `SELECT d.*, r.label AS room_label,
       ${LUGGAGE_ITEMS_COUNT_SUBQUERY},
       ${LUGGAGE_SENSITIVE_SUBQUERY},
       ${ALLERGENS_SUBQUERY},
       ${APTITUDE_LEVELS_SUBQUERY}
     FROM dut1_records d
     LEFT JOIN rooms r ON r.id = d.room_id
     ORDER BY d.created_at DESC, d.id DESC
     LIMIT $1 OFFSET $2`;

// Version actuelle : le total voyage avec la page (fenêtre évaluée avant LIMIT).
const DUT1_LIST_CONSOLIDATED_SQL = `SELECT d.*, r.label AS room_label,
       ${LUGGAGE_ITEMS_COUNT_SUBQUERY},
       ${LUGGAGE_SENSITIVE_SUBQUERY},
       ${ALLERGENS_SUBQUERY},
       ${APTITUDE_LEVELS_SUBQUERY},
       COUNT(*) OVER () AS total_count
     FROM dut1_records d
     LEFT JOIN rooms r ON r.id = d.room_id
     ORDER BY d.created_at DESC, d.id DESC
     LIMIT $1 OFFSET $2`;

const DUT1_DETAIL_SQL = `SELECT d.*, r.label AS room_label,
       ${LUGGAGE_ITEMS_COUNT_SUBQUERY},
       ${LUGGAGE_SENSITIVE_SUBQUERY},
       ${ALLERGENS_SUBQUERY},
       ${APTITUDE_LEVELS_SUBQUERY}
     FROM dut1_records d
     LEFT JOIN rooms r ON r.id = d.room_id
     WHERE d.id = $1`;

const RISKS_ALLERGY_SQL = `SELECT DISTINCT
       d.id, d.first_name, d.last_name, d.department, d.gender, r.label AS room_label,
       a.label AS allergen_label, da.severity,
       dish.name AS dish_name, ms.meal_type AS meal_type
     FROM dut1_records d
     JOIN dut1_allergens da ON da.dut1_id = d.id
     JOIN allergens a ON a.id = da.allergen_id
     JOIN dish_allergens dga ON dga.allergen_id = a.id
     JOIN dishes dish ON dish.id = dga.dish_id
     JOIN meal_services ms ON ms.id = dish.meal_service_id
     LEFT JOIN rooms r ON r.id = d.room_id
     WHERE ms.service_date = $1
     ORDER BY d.last_name, d.first_name`;

const RISKS_RESTRICTION_SQL = `SELECT
       d.id, d.first_name, d.last_name, d.department, d.gender, r.label AS room_label,
       hr.reason, hr.end_date, hr.criterion_id, act.name AS activity_name
     FROM health_restrictions hr
     JOIN dut1_records d ON d.id = hr.dut1_id
     LEFT JOIN rooms r ON r.id = d.room_id
     LEFT JOIN activities act ON act.id = hr.activity_id
     WHERE hr.resolved_at IS NULL
       AND hr.start_date <= $1
       AND (hr.end_date IS NULL OR hr.end_date >= $1)
     ORDER BY d.last_name, d.first_name`;

const TODAY_ACTIVITIES_SQL = `SELECT id, name FROM activities
  WHERE $1 BETWEEN activity_date AND COALESCE(end_date, activity_date)`;

const REQUIRED_CRITERIA_SQL = `SELECT arc.activity_id, arc.criterion_id, ac.label AS criterion_label,
       lvl.rank AS min_rank, lvl.label AS min_level_label
     FROM activity_required_criteria arc
     JOIN aptitude_criteria ac ON ac.id = arc.criterion_id
     JOIN aptitude_criterion_levels lvl ON lvl.id = arc.min_level_id
     WHERE arc.activity_id = ANY($1::int[])`;

// Version actuelle (depuis « 1 vague ») : le filtre « activités du jour » est
// dans la requête, plus besoin de charger la liste des activités avant.
const REQUIRED_CRITERIA_BY_DATE_SQL = `SELECT arc.activity_id, arc.criterion_id, ac.label AS criterion_label,
       lvl.rank AS min_rank, lvl.label AS min_level_label, act.name AS activity_name
     FROM activity_required_criteria arc
     JOIN aptitude_criteria ac ON ac.id = arc.criterion_id
     JOIN aptitude_criterion_levels lvl ON lvl.id = arc.min_level_id
     JOIN activities act ON act.id = arc.activity_id
       AND $1 BETWEEN act.activity_date AND COALESCE(act.end_date, act.activity_date)`;

// Copie fidèle de la requête d'écarts d'aptitude du contrôleur : la jointure
// ne remonte que les DUT1 dont le niveau déclaré est absent ou inférieur au
// minimum exigé par une activité du jour (l'ancienne version chargeait tous les
// dossiers complétés + tous les niveaux en Node, puis croisait en boucle).
const APTITUDE_MISMATCHES_SQL = `SELECT d.id, d.first_name, d.last_name, d.department, d.gender,
       r.label AS room_label,
       arc.activity_id, ac.label AS criterion_label,
       lvl.label AS min_level_label, own.label AS own_label
     FROM activity_required_criteria arc
     JOIN aptitude_criteria ac ON ac.id = arc.criterion_id
     JOIN aptitude_criterion_levels lvl ON lvl.id = arc.min_level_id
     JOIN dut1_records d ON d.complementary_completed_at IS NOT NULL
     LEFT JOIN rooms r ON r.id = d.room_id
     LEFT JOIN dut1_aptitude_levels dal
       ON dal.dut1_id = d.id AND dal.criterion_id = arc.criterion_id
     LEFT JOIN aptitude_criterion_levels own ON own.id = dal.level_id
     WHERE arc.activity_id = ANY($1::int[])
       AND (own.rank IS NULL OR own.rank < lvl.rank)`;

const APTITUDE_MISMATCHES_BY_DATE_SQL = `SELECT d.id, d.first_name, d.last_name, d.department, d.gender,
       r.label AS room_label,
       arc.activity_id, ac.label AS criterion_label,
       lvl.label AS min_level_label, own.label AS own_label, act.name AS activity_name
     FROM activity_required_criteria arc
     JOIN aptitude_criteria ac ON ac.id = arc.criterion_id
     JOIN aptitude_criterion_levels lvl ON lvl.id = arc.min_level_id
     JOIN activities act ON act.id = arc.activity_id
       AND $1 BETWEEN act.activity_date AND COALESCE(act.end_date, act.activity_date)
     JOIN dut1_records d ON d.complementary_completed_at IS NOT NULL
     LEFT JOIN rooms r ON r.id = d.room_id
     LEFT JOIN dut1_aptitude_levels dal
       ON dal.dut1_id = d.id AND dal.criterion_id = arc.criterion_id
     LEFT JOIN aptitude_criterion_levels own ON own.id = dal.level_id
     WHERE own.rank IS NULL OR own.rank < lvl.rank`;

// Ancien code (avant 9c4acd5) : tous les dossiers complétés et tous les
// niveaux déclarés, croisés ensuite en JavaScript — deux requêtes de plus.
const COMPLETED_DUT1_SQL = `SELECT d.id, d.first_name, d.last_name, d.department, d.gender, r.label AS room_label
     FROM dut1_records d
     LEFT JOIN rooms r ON r.id = d.room_id
     WHERE d.complementary_completed_at IS NOT NULL`;

const OWN_LEVELS_SQL = `SELECT dal.dut1_id, dal.criterion_id, lvl.rank, lvl.label
     FROM dut1_aptitude_levels dal
     JOIN aptitude_criterion_levels lvl ON lvl.id = dal.level_id`;

const TREATMENTS_ACTIVE_SQL = `SELECT t.*, m.name AS medication_name,
       TO_CHAR(t.start_date, 'YYYY-MM-DD') AS start_date_iso,
       TO_CHAR(t.end_date, 'YYYY-MM-DD') AS end_date_iso,
       d.first_name, d.last_name, d.department, r.label AS room_label,
       u.full_name AS ended_by_name,
       (t.ended_at IS NULL AND t.start_date <= $1 AND (t.end_date IS NULL OR t.end_date >= $1)) AS is_active
     FROM dut1_treatments t
     JOIN dut1_records d ON d.id = t.dut1_id
     LEFT JOIN rooms r ON r.id = d.room_id
     LEFT JOIN medications m ON m.id = t.medication_id
     LEFT JOIN users u ON u.id = t.ended_by
     WHERE (t.ended_at IS NULL AND t.start_date <= $1 AND (t.end_date IS NULL OR t.end_date >= $1))
     ORDER BY d.last_name ASC, d.first_name ASC, t.start_date DESC`;

const ACTIVE_RESTRICTIONS_SQL = `SELECT hr.*, act.name AS activity_name, ac.label AS criterion_label,
       d.first_name, d.last_name, d.department, r.label AS room_label
     FROM health_restrictions hr
     JOIN dut1_records d ON d.id = hr.dut1_id
     LEFT JOIN rooms r ON r.id = d.room_id
     LEFT JOIN activities act ON act.id = hr.activity_id
     LEFT JOIN aptitude_criteria ac ON ac.id = hr.criterion_id
     WHERE hr.resolved_at IS NULL
     ORDER BY hr.start_date ASC, d.last_name ASC`;

const ON_TREATMENT_SQL = `SELECT d.id, d.first_name, d.last_name, d.department, d.gender, r.label AS room_label,
            STRING_AGG(COALESCE(m.name, t.medication_label, 'Médicament non précisé'), ' + ') AS treatment_details
     FROM dut1_treatments t
     JOIN dut1_records d ON d.id = t.dut1_id
     LEFT JOIN rooms r ON r.id = d.room_id
     LEFT JOIN medications m ON m.id = t.medication_id
     WHERE t.ended_at IS NULL AND t.start_date <= CURRENT_DATE AND (t.end_date IS NULL OR t.end_date >= CURRENT_DATE)
     GROUP BY d.id, d.first_name, d.last_name, d.department, d.gender, r.label
     ORDER BY d.last_name ASC, d.first_name ASC`;

const ALLERGENS_SQL = `SELECT a.*,
       (SELECT COUNT(*) FROM dut1_allergens da WHERE da.allergen_id = a.id) AS dut1_count,
       (SELECT COUNT(*) FROM dish_allergens dga WHERE dga.allergen_id = a.id) AS dish_count
     FROM allergens a
     ORDER BY a.label ASC`;

const WITHOUT_COMPLEMENTARY_SQL = `SELECT d.*, ${ALLERGENS_SUBQUERY}, ${APTITUDE_LEVELS_SUBQUERY}
     FROM dut1_records d
     WHERE d.complementary_completed_at IS NULL
     ORDER BY d.created_at ASC, d.id ASC`;

// ---------------------------------------------------------------------------

const COUNTED_TABLES = [
  'dut1_records',
  'dut1_allergens',
  'allergens',
  'dut1_treatments',
  'health_restrictions',
  'luggage_items',
  'rooms',
  'activities',
  'dishes',
  'dish_allergens',
  'meal_services',
  'phase2_questions',
];

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const connectionString = opts.url || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      'DATABASE_URL manquant.\n' +
        'Renseignez backend/.env (cf. .env.example) ou passez --url=postgresql://…\n' +
        'Aide : npm run bench:queries -- --help'
    );
    process.exitCode = 1;
    return;
  }

  let host = '(inconnu)';
  try {
    host = new URL(connectionString).hostname;
  } catch {
    // chaîne non-URL (rare) : on n'affiche pas les identifiants
  }

  // Un pool de quelques connexions : c'est ce qui permet de mesurer les vagues
  // parallèles du code actuel. Chaque connexion est basculée en READ ONLY dès
  // sa première utilisation (garde-fou au niveau session, pas seulement
  // transaction) — le pooler Supabase ignore l'option de démarrage `options`,
  // d'où ce SET explicite. Le coût de ce SET n'est payé qu'une fois par
  // connexion, avant les mesures.
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    application_name: 'integration-platform-bench',
    connectionTimeoutMillis: 15_000,
  });
  const readOnlyReady = new WeakSet();
  const db = {
    async query(sql, params) {
      const conn = await pool.connect();
      try {
        if (!readOnlyReady.has(conn)) {
          await conn.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY; SET statement_timeout = 30000');
          readOnlyReady.add(conn);
        }
        return await conn.query(sql, params);
      } finally {
        conn.release();
      }
    },
    end: () => pool.end(),
  };

  try {
    const guard = await db.query('SHOW default_transaction_read_only');
    if (guard.rows[0].default_transaction_read_only !== 'on') {
      throw new Error('la session n’est pas en READ ONLY — abandon par sécurité');
    }

    const tables = [];
    for (const table of COUNTED_TABLES) {
      try {
        const res = await db.query(`SELECT COUNT(*) AS n FROM ${table}`);
        tables.push({ table, rows: res.rows[0].n });
      } catch (err) {
        tables.push({ table, rows: null, error: err.message });
      }
    }

    // Paramètres dépendant des données réelles.
    const activitiesRes = await db.query(TODAY_ACTIVITIES_SQL, [opts.date]);
    const activityIds = activitiesRes.rows.map((r) => r.id);
    const firstDut1 = await db.query('SELECT id FROM dut1_records ORDER BY id ASC LIMIT 1');
    const sampleDut1Id = firstDut1.rows[0]?.id ?? null;

    const scenarios = [
      { name: 'stats/overview — séquentiel, ancien code (5 allers-retours)', statements: STATS_OVERVIEW_CURRENT },
      { name: 'stats/overview — consolidé, code actuel (1 requête)', statements: STATS_OVERVIEW_CONSOLIDATED },
      { name: 'stats/health-overview — séquentiel, ancien code (7 allers-retours)', statements: HEALTH_OVERVIEW_CURRENT },
      { name: 'stats/health-overview — consolidé, code actuel (1 requête)', statements: HEALTH_OVERVIEW_CONSOLIDATED },
      {
        name: 'GET /api/dut1 (page 1, 25) — COUNT + page, étape précédente (2 allers-retours)',
        waves: [
          [{ sql: 'SELECT COUNT(*) AS n FROM dut1_records d' }],
          [{ sql: DUT1_LIST_SQL, params: [25, 0] }],
        ],
      },
      {
        name: 'GET /api/dut1 (page 1, 25) — code actuel (1 requête)',
        waves: [[{ sql: DUT1_LIST_CONSOLIDATED_SQL, params: [25, 0] }]],
      },
      sampleDut1Id
        ? { name: 'GET /api/dut1/:id — détail', statements: [{ sql: DUT1_DETAIL_SQL, params: [sampleDut1Id] }] }
        : null,
      { name: 'GET /api/dut1/without-complementary', statements: [{ sql: WITHOUT_COMPLEMENTARY_SQL }] },
      { name: 'GET /api/health/restrictions/active', statements: [{ sql: ACTIVE_RESTRICTIONS_SQL }] },
      { name: 'GET /api/health/on-treatment', statements: [{ sql: ON_TREATMENT_SQL }] },
      { name: 'GET /api/health/treatments (actifs)', statements: [{ sql: TREATMENTS_ACTIVE_SQL, params: [opts.date] }] },
      {
        name: 'GET /api/health/risks — séquentiel, ancien code (6 allers-retours)',
        statements: [
          { sql: RISKS_ALLERGY_SQL, params: [opts.date] },
          { sql: RISKS_RESTRICTION_SQL, params: [opts.date] },
          { sql: TODAY_ACTIVITIES_SQL, params: [opts.date] },
          ...(activityIds.length
            ? [
                { sql: REQUIRED_CRITERIA_SQL, params: [activityIds] },
                { sql: COMPLETED_DUT1_SQL },
                { sql: OWN_LEVELS_SQL },
              ]
            : []),
        ],
      },
      {
        name: 'GET /api/health/risks — étape précédente (2 vagues, 5 requêtes)',
        waves: [
          [
            { sql: RISKS_ALLERGY_SQL, params: [opts.date] },
            { sql: RISKS_RESTRICTION_SQL, params: [opts.date] },
            { sql: TODAY_ACTIVITIES_SQL, params: [opts.date] },
          ],
          ...(activityIds.length
            ? [
                [
                  { sql: REQUIRED_CRITERIA_SQL, params: [activityIds] },
                  { sql: APTITUDE_MISMATCHES_SQL, params: [activityIds] },
                ],
              ]
            : []),
        ],
      },
      {
        name: 'GET /api/health/risks — code actuel (1 vague, 4 requêtes)',
        waves: [
          [
            { sql: RISKS_ALLERGY_SQL, params: [opts.date] },
            { sql: RISKS_RESTRICTION_SQL, params: [opts.date] },
            { sql: REQUIRED_CRITERIA_BY_DATE_SQL, params: [opts.date] },
            { sql: APTITUDE_MISMATCHES_BY_DATE_SQL, params: [opts.date] },
          ],
        ],
      },
      { name: 'GET /api/allergens', statements: [{ sql: ALLERGENS_SQL }] },
      { name: 'GET /api/activities', statements: [{ sql: 'SELECT * FROM activities ORDER BY activity_date ASC, start_time ASC NULLS LAST, name ASC' }] },
      { name: 'GET /api/phase2-questions', statements: [{ sql: 'SELECT * FROM phase2_questions ORDER BY position ASC, id ASC' }] },
    ].filter(Boolean);

    const results = [];
    for (const scenario of scenarios) {
      results.push(await measure(db, scenario, opts));

      if (opts.detail) {
        const statements = scenario.waves ? scenario.waves.flat() : scenario.statements;
        for (const [index, stmt] of statements.entries()) {
          results.push(
            await measure(
              db,
              { name: `  ↳ ${scenario.name} · requête ${index + 1}`, statements: [stmt] },
              opts
            )
          );
        }
      }
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      host,
      iterations: opts.iterations,
      warmup: opts.warmup,
      date: opts.date,
      tables,
      results,
    };

    if (opts.json) {
      console.log(JSON.stringify(payload, null, 2));
      return;
    }

    console.log(`\nBase : ${host} — date simulée : ${opts.date}`);
    console.log(`Mesures : ${opts.warmup} échauffement(s), ${opts.iterations} itérations\n`);

    console.log('Volumes (lignes)');
    for (const row of tables) {
      const label = row.table.padEnd(24);
      console.log(`  ${label} ${row.error ? `erreur : ${row.error}` : String(row.rows).padStart(8)}`);
    }

    console.log('\nLatence SQL (ms, aller-retour inclus)');
    const header = ['Scénario', 'p50', 'p95', 'max', 'moy.', 'req.', 'vagues'];
    console.log(
      `  ${header[0].padEnd(62)} ${header[1].padStart(8)} ${header[2].padStart(8)} ${header[3].padStart(8)} ${header[4].padStart(8)} ${header[5].padStart(4)} ${header[6].padStart(6)}`
    );
    for (const r of results) {
      console.log(
        `  ${r.name.padEnd(62)} ${String(r.p50).padStart(8)} ${String(r.p95).padStart(8)} ${String(r.max).padStart(8)} ${String(r.mean).padStart(8)} ${String(r.queries).padStart(4)} ${String(r.waves).padStart(6)}`
      );
    }
    console.log(
      '\nLecture : comparez « séquentiel » (ancien code) et « vagues » (code actuel) à\n' +
        'volumes réels. « req. » = nombre de requêtes SQL, « vagues » = nombre d’allers-\n' +
        'retours réseau empilés (une vague parallèle ne coûte qu’un aller-retour).\n' +
        'Si p95 d’une liste dépasse ~200 ms, la requête (ou le réseau Supabase) est le\n' +
        'point chaud ; si toutes les requêtes sont rapides mais l’API lente, cherchez\n' +
        'côté Node/cold start ou sérialisation JSON.\n'
    );
  } finally {
    await db.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(`\nÉchec du benchmark : ${err.message}`);
  if (err.code) console.error(`Code Postgres : ${err.code}`);
  process.exitCode = 1;
});
