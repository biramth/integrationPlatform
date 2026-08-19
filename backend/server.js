require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const dut1Routes = require('./routes/dut1Routes');
const luggageRoutes = require('./routes/luggageRoutes');
const roomRoutes = require('./routes/roomRoutes');
const agentRoutes = require('./routes/agentRoutes');
const statsRoutes = require('./routes/statsRoutes');
const allergenRoutes = require('./routes/allergenRoutes');
const mealRoutes = require('./routes/mealRoutes');
const healthRoutes = require('./routes/healthRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/dut1', dut1Routes);
app.use('/api', luggageRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/allergens', allergenRoutes);
app.use('/api', mealRoutes);
app.use('/api/health', healthRoutes);

app.use('/api', notFoundHandler);

if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  app.get('/*splat', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Plateforme intégration DUT1 — API en ligne.');
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
