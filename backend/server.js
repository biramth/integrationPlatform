require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');

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
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Render place l'app derrière son proxy : sans ceci, req.ip vaut l'IP du proxy
// et le rate limiter de /api/auth/login mettrait tous les utilisateurs dans le
// même compteur (10 tentatives pour tout le monde au lieu de 10 par personne).
app.set('trust proxy', 1);

// Le frontend est servi par Vercel, l'API par Render : les deux origines sont
// différentes, il faut donc autoriser explicitement celle du frontend.
// CORS_ORIGIN est une liste séparée par des virgules ; une entrée peut
// commencer par "*." pour couvrir les déploiements de preview Vercel
// (ex: "https://integration-dut1.vercel.app,*.vercel.app").
// Sans CORS_ORIGIN (développement local), toutes les origines sont acceptées.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  return allowedOrigins.some((allowed) =>
    allowed.startsWith('*.') ? origin.endsWith(allowed.slice(1)) : allowed === origin
  );
}

app.use(
  cors({
    origin(origin, callback) {
      // Origin absent = appel same-origin, curl, ou health check de Render.
      if (!origin || allowedOrigins.length === 0 || isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      const error = new Error(`Origine non autorisée par CORS : ${origin}`);
      // .status pour que errorHandler réponde 403 plutôt que 500 : une origine
      // refusée est un rejet attendu, pas un bug serveur à investiguer.
      error.status = 403;
      return callback(error);
    },
  })
);

// Gzip des réponses JSON : les listes de dossiers/chambres compressent très
// bien, ce qui compte maintenant que chaque réponse traverse le réseau public
// au lieu d'être servie depuis le même processus que le frontend.
app.use(compression());
app.use(express.json());

// Sonde légère pour le health check de Render (et pour un éventuel ping
// anti-veille sur le plan gratuit) : ne touche pas la base de données.
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRoutes);
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

app.use('/api', notFoundHandler);

app.get('/', (req, res) => {
  res.send('Plateforme intégration DUT1 — API en ligne.');
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
