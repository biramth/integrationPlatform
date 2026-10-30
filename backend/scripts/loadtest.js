#!/usr/bin/env node
// Test de charge HTTP ciblé sur les écrans fréquentés — lecture seule.
//
// Chaque endpoint est mesuré séparément avec autocannon : débit, latence
// (p50/p97.5/p99) et codes HTTP. Le scénario est choisi selon le rôle du compte
// (un compte Santé n'a rien à faire sur /api/stats/overview, etc.).
//
// Usage (depuis backend/) :
//   npm run loadtest -- --url=http://localhost:3000 --username=agent --password=…
//   npm run loadtest -- --url=https://… --token=…
//   npm run loadtest -- --requests=100 --connections=3 --endpoints=/api/dut1
//
// Sécurité : uniquement des GET. Le garde-fou --max-total (défaut 4000) arrête
// le test avant d'atteindre la limite de 5000 requêtes/15 min par compte.
//
// Rappel : /api/stats/* et /api/dut1 sont mis en cache 15–60 s. Un test HTTP
// mesure donc surtout le chemin « cache chaud » ; le coût SQL réel se mesure
// avec bench-queries.js.

const autocannon = require('autocannon');
const { resolveToken, decodeJwtPayload } = require('./lib/auth');

// Permet de garder LOADTEST_USERNAME / LOADTEST_PASSWORD / LOADTEST_URL dans
// backend/.env (jamais dans l'historique du shell).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });

const DEFAULT_URL = process.env.LOADTEST_URL || 'http://localhost:3000';
const DEFAULT_CONNECTIONS = 5;
const DEFAULT_REQUESTS = 200;
const DEFAULT_DURATION = 10;
const DEFAULT_MAX_TOTAL = 4000;
const USER_LIMIT_PER_15_MIN = 5000;

function parseArgs(argv) {
  const opts = {
    url: DEFAULT_URL,
    token: null,
    username: null,
    password: null,
    connections: DEFAULT_CONNECTIONS,
    requests: DEFAULT_REQUESTS,
    duration: DEFAULT_DURATION,
    maxTotal: DEFAULT_MAX_TOTAL,
    endpoints: null,
    json: false,
    help: false,
    date: new Date().toISOString().slice(0, 10),
  };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--json') opts.json = true;
    else if (arg.startsWith('--url=')) opts.url = arg.split('=')[1];
    else if (arg.startsWith('--token=')) opts.token = arg.slice('--token='.length);
    else if (arg.startsWith('--username=')) opts.username = arg.split('=')[1];
    else if (arg.startsWith('--password=')) opts.password = arg.slice('--password='.length);
    else if (arg.startsWith('--connections=')) opts.connections = Math.max(1, Number(arg.split('=')[1]) || DEFAULT_CONNECTIONS);
    else if (arg.startsWith('--requests=')) opts.requests = Math.max(1, Number(arg.split('=')[1]) || DEFAULT_REQUESTS);
    else if (arg.startsWith('--duration=')) opts.duration = Math.max(1, Number(arg.split('=')[1]) || DEFAULT_DURATION);
    else if (arg.startsWith('--max-total=')) opts.maxTotal = Math.max(0, Number(arg.split('=')[1]) || 0);
    else if (arg.startsWith('--endpoints=')) opts.endpoints = arg.slice('--endpoints='.length).split(',').map((p) => p.trim()).filter(Boolean);
    else if (arg.startsWith('--date=')) opts.date = arg.split('=')[1];
    else {
      console.error(`Option inconnue : ${arg}`);
      process.exit(1);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`Test de charge HTTP en lecture seule (autocannon)

Usage : npm run loadtest -- [options]

Authentification (l'un des deux) :
  --token=JWT              Jeton d'un compte de test
  --username=… --password=… Connexion via /api/auth/login (ou LOADTEST_USERNAME /
                            LOADTEST_PASSWORD dans l'environnement)

Charge :
  --url=URL                Origine de l'API (défaut ${DEFAULT_URL})
  --connections=N          Connexions simultanées (défaut ${DEFAULT_CONNECTIONS})
  --requests=N             Requêtes par endpoint (défaut ${DEFAULT_REQUESTS})
  --duration=N             Durée maximale par endpoint en secondes (défaut ${DEFAULT_DURATION})
  --max-total=N            Arrêt avant N requêtes cumulées (défaut ${DEFAULT_MAX_TOTAL},
                           0 = désactivé). Protège la limite de ${USER_LIMIT_PER_15_MIN}/15 min par compte.
  --endpoints=/a,/b        Force une liste d'endpoints (sinon scénario selon le rôle)
  --date=YYYY-MM-DD        Date pour /api/health/risks (défaut aujourd'hui)
  --json                   Sortie JSON (pour comparer avant/après)
  -h, --help               Affiche cette aide

Sécurité : GET uniquement, aucune écriture. Un 429 signifie que la limite par
compte est atteinte : attendez 15 min et relancez avec --requests plus bas.
`);
}

const ALL_VIEWER_ROLES = ['orga', 'sante', 'cuisine', 'communication', 'presidentielle'];
const isIt = (payload) => payload?.role === 'it';
const canSeeHealthSuivi = (payload) =>
  payload?.role === 'sante' &&
  (!payload.subRole || payload.subRole === 'suivi' || !!payload.isCommissionLead);
const canSeeHealthPhase2 = (payload) =>
  payload?.role === 'sante' &&
  (!payload.subRole || payload.subRole === 'phase2' || !!payload.isCommissionLead);

// Scénario par défaut : uniquement des endpoints que ce rôle a le droit
// d'appeler, pour ne pas mesurer des 403.
function defaultEndpoints(payload, date) {
  const role = payload?.role;
  if (!payload) {
    // Jeton opaque : on reste sur les endpoints accessibles à tout compte.
    return ['/api/activities', '/api/dut1', '/api/allergens'];
  }

  const endpoints = ['/api/activities'];
  if (isIt(payload) || ALL_VIEWER_ROLES.includes(role)) endpoints.push('/api/dut1');
  if (isIt(payload) || role === 'orga' || role === 'presidentielle') {
    endpoints.push('/api/stats/overview', '/api/stats/rooms-occupancy');
    endpoints.push(`/api/health/risks?date=${date}`);
  }
  if (isIt(payload) || canSeeHealthSuivi(payload)) {
    endpoints.push(
      '/api/stats/health-overview',
      '/api/stats/illness-trend',
      '/api/stats/allergy-prevalence',
      `/api/health/risks?date=${date}`,
      '/api/health/restrictions/active',
      '/api/health/on-treatment',
      '/api/health/treatments',
      '/api/allergens'
    );
  }
  if (isIt(payload) || canSeeHealthPhase2(payload)) {
    endpoints.push('/api/dut1/without-complementary', '/api/allergens');
  }
  if (isIt(payload) || role === 'sante') endpoints.push('/api/phase2-questions');
  if (role === 'presidentielle') endpoints.push('/api/activities');
  if (role === 'dreudj') endpoints.push(`/api/health/risks?date=${date}`);

  return [...new Set(endpoints)];
}

function countStatus(result, code) {
  const entry = result.statusCodeStats?.[String(code)];
  return entry ? Number(entry.count) : 0;
}

function statusSummary(result) {
  const codes = {};
  let non2xx = 0;
  for (const [code, entry] of Object.entries(result.statusCodeStats || {})) {
    codes[code] = Number(entry.count);
    if (!code.startsWith('2')) non2xx += Number(entry.count);
  }
  return { codes, non2xx };
}

async function warmUp(url, headers) {
  try {
    await fetch(url, { headers });
  } catch {
    // L'échec réel sera visible dans autocannon ; l'échauffement ne bloque pas.
  }
}

async function runOne({ baseUrl, path, headers, opts }) {
  const url = `${baseUrl}${path}`;
  await warmUp(url, headers);

  const result = await autocannon({
    url,
    method: 'GET',
    headers,
    connections: opts.connections,
    amount: opts.requests,
    duration: opts.duration,
    // Pas de pipelining : on veut la latence d'une requête, pas d'un lot.
    pipelining: 1,
    // Les réponses non-2xx ne doivent pas fausser la latence des 200.
    excludeErrorStats: true,
  });

  const statuses = statusSummary(result);
  return {
    endpoint: path,
    requests: result.requests.sent,
    completed: result.requests.total,
    requestsPerSec: result.requests.average,
    latency: {
      p50: result.latency.p50,
      p97_5: result.latency.p97_5,
      p99: result.latency.p99,
      max: result.latency.max,
      mean: result.latency.average,
    },
    throughputBytesPerSec: result.throughput.average,
    statuses: statuses.codes,
    non2xx: statuses.non2xx,
    errors: result.errors,
    timeouts: result.timeouts,
    rateLimited: countStatus(result, 429),
  };
}

function fmt(value, digits = 2) {
  return Number(value).toFixed(digits);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const baseUrl = opts.url.replace(/\/$/, '');

  let auth;
  try {
    auth = await resolveToken({ apiUrl: baseUrl, token: opts.token, username: opts.username, password: opts.password });
  } catch (err) {
    console.error(`Authentification impossible : ${err.message}`);
    process.exitCode = 1;
    return;
  }
  if (!auth) {
    console.error(
      'Aucun compte fourni.\n' +
        'Passez --token=… ou --username=… --password=… (ou LOADTEST_USERNAME/LOADTEST_PASSWORD).\n' +
        'Aide : npm run loadtest -- --help'
    );
    process.exitCode = 1;
    return;
  }

  const payload = decodeJwtPayload(auth.token);
  const headers = { Authorization: `Bearer ${auth.token}` };
  const paths = opts.endpoints && opts.endpoints.length ? opts.endpoints : defaultEndpoints(payload, opts.date);

  if (!opts.json) {
    console.log(`\nAPI : ${baseUrl}`);
    console.log(`Compte : ${payload ? `${payload.username} (rôle ${payload.role}${payload.subRole ? `/${payload.subRole}` : ''})` : 'jeton opaque'}`);
    console.log(
      `Charge : ${opts.connections} connexions, ${opts.requests} requêtes/endpoint, ${opts.duration}s max — ${paths.length} endpoint(s)\n`
    );
  }

  const results = [];
  let totalRequests = 0;
  let stoppedEarly = false;

  for (const path of paths) {
    if (opts.maxTotal > 0 && totalRequests >= opts.maxTotal) {
      stoppedEarly = true;
      break;
    }
    const remainingBudget = opts.maxTotal > 0 ? opts.maxTotal - totalRequests : 0;
    const perRun = opts.maxTotal > 0 ? Math.min(opts.requests, remainingBudget) : opts.requests;

    try {
      const result = await runOne({
        baseUrl,
        path,
        headers,
        opts: { ...opts, requests: Math.max(1, perRun) },
      });
      totalRequests += result.requests;
      results.push(result);

      if (!opts.json) {
        const codes = Object.entries(result.statuses)
          .map(([code, count]) => `${code}:${count}`)
          .join(' ');
        console.log(
          `${path.padEnd(36)} ${String(result.requestsPerSec.toFixed(1)).padStart(7)} req/s  ` +
            `p50 ${fmt(result.latency.p50, 0).padStart(4)} ms  p97.5 ${fmt(result.latency.p97_5, 0).padStart(4)} ms  ` +
            `p99 ${fmt(result.latency.p99, 0).padStart(4)} ms  ${codes}`
        );
        if (result.errors || result.timeouts) {
          console.log(`  ⚠ erreurs réseau : ${result.errors}, timeouts : ${result.timeouts}`);
        }
        if (result.rateLimited > 0) {
          console.log(`  ⚠ ${result.rateLimited} réponse(s) 429 : limite par compte atteinte, chiffres non représentatifs.`);
        }
      }
    } catch (err) {
      const failure = { endpoint: path, error: err.message };
      results.push(failure);
      if (!opts.json) console.log(`${path.padEnd(36)} ÉCHEC : ${err.message}`);
    }
  }

  const totalNon2xx = results.reduce((sum, r) => sum + (r.non2xx || 0), 0);
  const totalRateLimited = results.reduce((sum, r) => sum + (r.rateLimited || 0), 0);

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          baseUrl,
          role: payload?.role ?? null,
          connections: opts.connections,
          requestsPerEndpoint: opts.requests,
          totalRequests,
          stoppedEarly,
          results,
        },
        null,
        2
      )
    );
  } else {
    console.log(`\nTotal envoyé : ${totalRequests} requête(s)`);
    if (totalNon2xx) console.log(`Réponses non-2xx : ${totalNon2xx}`);
    if (totalRateLimited) {
      console.log(
        `⚠ ${totalRateLimited} réponse(s) 429 au total : relancez dans 15 min ou réduisez --requests\n` +
          `  (limite ${USER_LIMIT_PER_15_MIN} requêtes/15 min par compte).`
      );
    }
    if (stoppedEarly) {
      console.log(`Test arrêté au plafond --max-total=${opts.maxTotal} : certains endpoints n'ont pas été mesurés.`);
    }
    console.log(
      '\nLecture : un p99 qui explose avec peu de connexions indique un blocage (event loop,\n' +
        'requête SQL lente, cold start), pas seulement un manque de CPU. Comparez toujours\n' +
        'les mêmes endpoints, la même charge et le même compte avant/après.\n'
    );
  }
}

main().catch((err) => {
  console.error(`\nÉchec du test de charge : ${err.message}`);
  process.exitCode = 1;
});
