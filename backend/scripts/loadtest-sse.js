#!/usr/bin/env node
// Capacité du flux temps réel (SSE) — lecture seule.
//
// Ouvre N connexions EventSource simultanées sur /api/events, mesure le temps
// d'établissement, puis les maintient ouvertes pendant la durée demandée en
// comptant les événements reçus et les coupures. C'est le test qui dit si le
// serveur tient « tous les navigateurs ouverts en même temps », ce qu'un test
// HTTP classique ne mesure pas (chaque connexion reste ouverte).
//
// Usage (depuis backend/) :
//   npm run loadtest:sse -- --url=http://localhost:3000 --username=agent --password=…
//   npm run loadtest:sse -- --url=https://… --token=… --connections=30 --duration=60
//
// Sécurité : lecture seule. Le jeton passe en query param car EventSource ne
// sait pas poser d'en-tête Authorization (même contrainte que le navigateur).
// Ne collez pas la sortie --json contenant l'URL complète dans un ticket public.

const http = require('http');
const https = require('https');
const { resolveToken, decodeJwtPayload } = require('./lib/auth');

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });

const DEFAULT_URL = process.env.LOADTEST_URL || 'http://localhost:3000';
const DEFAULT_CONNECTIONS = 10;
const DEFAULT_DURATION = 15;
const CONNECT_TIMEOUT_MS = 15_000;

function parseArgs(argv) {
  const opts = {
    url: DEFAULT_URL,
    token: null,
    username: null,
    password: null,
    connections: DEFAULT_CONNECTIONS,
    duration: DEFAULT_DURATION,
    json: false,
    help: false,
  };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--json') opts.json = true;
    else if (arg.startsWith('--url=')) opts.url = arg.split('=')[1];
    else if (arg.startsWith('--token=')) opts.token = arg.slice('--token='.length);
    else if (arg.startsWith('--username=')) opts.username = arg.split('=')[1];
    else if (arg.startsWith('--password=')) opts.password = arg.slice('--password='.length);
    else if (arg.startsWith('--connections=')) opts.connections = Math.max(1, Number(arg.split('=')[1]) || DEFAULT_CONNECTIONS);
    else if (arg.startsWith('--duration=')) opts.duration = Math.max(1, Number(arg.split('=')[1]) || DEFAULT_DURATION);
    else {
      console.error(`Option inconnue : ${arg}`);
      process.exit(1);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`Test de capacité du flux SSE (/api/events)

Usage : npm run loadtest:sse -- [options]

Authentification (l'un des deux) :
  --token=JWT               Jeton d'un compte de test
  --username=… --password=… Connexion via /api/auth/login (ou LOADTEST_USERNAME /
                            LOADTEST_PASSWORD dans l'environnement)

Charge :
  --url=URL                 Origine de l'API (défaut ${DEFAULT_URL})
  --connections=N           Connexions SSE simultanées (défaut ${DEFAULT_CONNECTIONS})
  --duration=N              Durée de maintien en secondes (défaut ${DEFAULT_DURATION})
  --json                    Sortie JSON (pour comparer avant/après)
  -h, --help                Affiche cette aide

Lecture : si des connexions échouent ou tombent avant la fin, le serveur (ou un
proxy) ne tient pas la charge. Un temps de connexion qui croît avec N indique
une limite CPU/file de descripteurs, pas un problème de bande passante (le flux
est quasi vide : quelques octets par mutation).
`);
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

// Compte les lignes `data:` et `:` (commentaire/heartbeat) sans supposer que
// chaque chunk réseau contient un message complet.
function consumeChunk(state, chunk) {
  state.bytes += chunk.length;
  state.buffer += chunk.toString('utf8');
  let newline = state.buffer.indexOf('\n');
  while (newline !== -1) {
    const line = state.buffer.slice(0, newline).replace(/\r$/, '');
    state.buffer = state.buffer.slice(newline + 1);
    if (line.startsWith('data:')) state.events += 1;
    else if (line.startsWith(':')) state.heartbeats += 1;
    newline = state.buffer.indexOf('\n');
  }
}

function openConnection(url, state) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https:') ? https : http;
    const startedAt = performance.now();
    let settled = false;
    const settle = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    const req = mod.request(url, { method: 'GET', headers: { Accept: 'text/event-stream' } }, (res) => {
      state.status = res.statusCode;
      state.connectMs = performance.now() - startedAt;

      if (res.statusCode !== 200) {
        state.failed = true;
        state.error = `HTTP ${res.statusCode}`;
        res.resume();
        res.on('end', settle);
        settle();
        return;
      }

      state.connected = true;
      state.res = res;
      // Le heartbeat serveur est toutes les 25 s : le timeout de connexion de
      // 15 s ne doit plus s'appliquer une fois le flux établi.
      req.setTimeout(0);
      settle();

      res.on('data', (chunk) => consumeChunk(state, chunk));
      res.on('end', () => {
        if (!state.closing) state.closedEarly = true;
      });
      res.on('error', (err) => {
        if (!state.closing) {
          state.closedEarly = true;
          state.error = err.message;
        }
      });
    });

    state.req = req;
    req.on('error', (err) => {
      if (state.closing) return settle();
      state.error = err.message;
      if (!state.connected) state.failed = true;
      else state.closedEarly = true;
      settle();
    });
    req.setTimeout(CONNECT_TIMEOUT_MS, () => {
      if (!state.connected) {
        state.failed = true;
        state.error = 'timeout de connexion';
        req.destroy();
        settle();
      }
    });
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
        'Aide : npm run loadtest:sse -- --help'
    );
    process.exitCode = 1;
    return;
  }

  const payload = decodeJwtPayload(auth.token);
  const eventsUrl = `${baseUrl}/api/events?token=${encodeURIComponent(auth.token)}`;
  const states = Array.from({ length: opts.connections }, () => ({
    connected: false,
    failed: false,
    closedEarly: false,
    closing: false,
    status: null,
    connectMs: null,
    events: 0,
    heartbeats: 0,
    bytes: 0,
    buffer: '',
    error: null,
    req: null,
    res: null,
  }));

  if (!opts.json) {
    console.log(`\nAPI : ${baseUrl}`);
    console.log(`Compte : ${payload ? `${payload.username} (rôle ${payload.role})` : 'jeton opaque'}`);
    console.log(`SSE : ${opts.connections} connexion(s) simultanée(s), maintien ${opts.duration}s\n`);
  }

  const startedAt = performance.now();
  // Toutes les connexions sont demandées en même temps : c'est le pic réaliste
  // du matin quand chaque agent ouvre l'application.
  await Promise.all(states.map((state) => openConnection(eventsUrl, state)));

  const settledAt = performance.now();
  const connected = states.filter((s) => s.connected);
  const failed = states.filter((s) => s.failed);

  await sleep(opts.duration * 1000);

  // Fermeture volontaire : ne compte pas comme une coupure.
  for (const state of states) {
    state.closing = true;
    state.req?.destroy();
    state.res?.destroy();
  }
  await sleep(100);

  const connectTimes = connected.map((s) => s.connectMs).sort((a, b) => a - b);
  const disconnected = states.filter((s) => s.connected && s.closedEarly);
  const totalEvents = states.reduce((sum, s) => sum + s.events, 0);
  const totalHeartbeats = states.reduce((sum, s) => sum + s.heartbeats, 0);
  const totalBytes = states.reduce((sum, s) => sum + s.bytes, 0);
  const statusCodes = {};
  for (const state of states) {
    if (state.status != null) statusCodes[state.status] = (statusCodes[state.status] || 0) + 1;
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    role: payload?.role ?? null,
    requested: opts.connections,
    connected: connected.length,
    failed: failed.length,
    disconnectedEarly: disconnected.length,
    durationSeconds: opts.duration,
    connectMs: {
      p50: Number((percentile(connectTimes, 50) || 0).toFixed(2)),
      p95: Number((percentile(connectTimes, 95) || 0).toFixed(2)),
      max: Number((connectTimes[connectTimes.length - 1] || 0).toFixed(2)),
      setupElapsed: Number((settledAt - startedAt).toFixed(2)),
    },
    events: totalEvents,
    heartbeats: totalHeartbeats,
    bytes: totalBytes,
    statusCodes,
    errors: states.map((s) => s.error).filter(Boolean),
  };

  if (opts.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Connexions établies : ${summary.connected}/${summary.requested}`);
    if (summary.failed) {
      console.log(`Échecs : ${summary.failed} — ${summary.errors.slice(0, 3).join(' | ')}`);
    }
    console.log(
      `Temps d'établissement (ms) : p50 ${summary.connectMs.p50} · p95 ${summary.connectMs.p95} · max ${summary.connectMs.max}`
    );
    console.log(`Maintien ${opts.duration}s : ${summary.events} événement(s), ${summary.heartbeats} heartbeat(s), ${summary.bytes} octet(s)`);
    console.log(`Coupures prématurées : ${summary.disconnectedEarly}`);
    if (summary.failed || summary.disconnectedEarly) {
      console.log(
        '\n⚠ Toutes les connexions ne tiennent pas : vérifiez la limite de descripteurs, le proxy\n' +
          '(Render/Vercel) et la charge CPU de l\'instance à ce moment-là.'
      );
    }
    console.log(
      '\nLecture : le flux SSE coûte peu en bande passante, mais chaque connexion occupe une\n' +
        'socket et un objet serveur. Comparez le nombre de connexions tenues avant/après et\n' +
        'le p95 d\'établissement quand N augmente.\n'
    );
  }

  if (summary.connected === 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\nÉchec du test SSE : ${err.message}`);
  process.exitCode = 1;
});
