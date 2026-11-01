require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/authRoutes');
const dut1Routes = require('./routes/dut1Routes');
const luggageRoutes = require('./routes/luggageRoutes');
const roomRoutes = require('./routes/roomRoutes');
const agentRoutes = require('./routes/agentRoutes');
const statsRoutes = require('./routes/statsRoutes');
const allergenRoutes = require('./routes/allergenRoutes');
const mealRoutes = require('./routes/mealRoutes');
const healthRoutes = require('./routes/healthRoutes');
const activityRoutes = require('./routes/activityRoutes');
const importRoutes = require('./routes/importRoutes');
const admittedStudentsRoutes = require('./routes/admittedStudentsRoutes');
const platformRoutes = require('./routes/platformRoutes');
const platformSettingsRoutes = require('./routes/platformSettingsRoutes');
const auditRoutes = require('./routes/auditRoutes');
const phase2QuestionsRoutes = require('./routes/phase2QuestionsRoutes');
const medicationRoutes = require('./routes/medicationRoutes');
const aptitudeCriteriaRoutes = require('./routes/aptitudeCriteriaRoutes');
const eventRoutes = require('./routes/eventRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { requestId } = require('./middleware/requestId');

const app = express();
const PORT = 3000;

process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-at-least-32-chars-long-platform-secret';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET doit être défini et contenir au moins 32 caractères en production.');
}

// CORS en tout premier : autorise toutes les origines (Vercel, Render, local, previews)
// sans jamais lever de 403 sur les requêtes preflight OPTIONS.
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  })
);

// En tout premier : chaque requête a un id, dispo dans les logs serveur et
// dans le journal d'audit (colonne request_id) pour corréler les deux.
app.use(requestId);

// Render place l'app derrière son proxy : sans ceci, req.ip vaut l'IP du proxy
// et le rate limiter de /api/auth/login mettrait tous les utilisateurs dans le
// même compteur (10 tentatives pour tout le monde au lieu de 10 par personne).
app.set('trust proxy', 1);

// Sécurité : helmet configuré pour permettre l'affichage dans l'iframe du studio
app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Rate limiting global : protège contre les abus et le DoS sur tous les
// endpoints. Le login a son propre limiter plus strict (authRoutes.js).
const USER_LIMIT_PER_15_MIN = 5000;
const ANONYMOUS_LIMIT_PER_15_MIN = 300;

function rateLimitIdentity(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query?.token;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload?.id) return `user:${payload.id}`;
    } catch {
      // Jeton invalide : compté avec les requêtes anonymes de cette IP.
    }
  }
  return `ip:${ipKeyGenerator(req.ip)}`;
}

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: (req) => (rateLimitIdentity(req).startsWith('user:') ? USER_LIMIT_PER_15_MIN : ANONYMOUS_LIMIT_PER_15_MIN),
  keyGenerator: rateLimitIdentity,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
});
app.use('/api', globalLimiter);

// Gzip des réponses JSON : les listes de dossiers/chambres compressent très
// bien, ce qui compte maintenant que chaque réponse traverse le réseau public
// au lieu d'être servie depuis le même processus que le frontend.
// Exception : /api/events (SSE) — la compression bufferise les flux et
// empêcherait les événements d'arriver en temps réel.
app.use(
  compression({
    filter(req, res) {
      if (req.path.startsWith('/api/events')) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);
app.use(express.json({ limit: '1mb' }));

// Sonde légère pour le health check de Render (et pour un éventuel ping
// anti-veille sur le plan gratuit) : ne touche pas la base de données.
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRoutes);
// AVANT les montages génériques '/api' (luggage, meal) : eux posent un
// router.use(verifyToken) qui lit l'en-tête Authorization et renverrait 401
// avant que la route SSE ne puisse lire son token en query param.
app.use('/api/events', eventRoutes);
app.use('/api/dut1', dut1Routes);
app.use('/api', luggageRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/allergens', allergenRoutes);
app.use('/api', mealRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/import', importRoutes);
app.use('/api/admitted-students', admittedStudentsRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/platform-settings', platformSettingsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/phase2-questions', phase2QuestionsRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/aptitude-criteria', aptitudeCriteriaRoutes);

const path = require('path');
const frontendDist = path.resolve(__dirname, '../frontend/dist');

app.use('/api', notFoundHandler);

// Cache-Control optimisé pour la rapidité et la réduction de charge :
// - Fichiers hashés (Vite assets : JS, CSS, polices, webp...) en cache immutable 1 an
// - HTML racine (index.html) en no-cache pour garantir les mises à jour immédiates
app.use(
  express.static(frontendDist, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api') || req.path === '/healthz') {
    return next();
  }
  const indexPath = path.join(frontendDist, 'index.html');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.send('Plateforme intégration DUT1 — En cours de chargement.');
    }
  });
});

app.use(errorHandler);

const storageService = require('./services/storageService');

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
let cleanupRunning = false;

async function runCleanup() {
  if (cleanupRunning) return;
  cleanupRunning = true;
  try {
    const result = await storageService.cleanupOrphanedFiles();
    if (result.deleted > 0) {
      console.log(`[cleanup] ${result.deleted} fichier(s) orphelin(s) supprimé(s) du Storage.`);
    }
  } catch (err) {
    console.error('[cleanup] Erreur lors du nettoyage des fichiers orphelins :', err.message);
  } finally {
    cleanupRunning = false;
  }
}

setInterval(runCleanup, CLEANUP_INTERVAL_MS);
setTimeout(runCleanup, 30_000); // premier nettoyage 30s après le démarrage

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is listening on http://0.0.0.0:${PORT}`);
});
