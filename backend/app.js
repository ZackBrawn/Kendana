const express = require('express');
const cors = require('cors');
const path = require('path');
const { prisma } = require('./config/db');
const routes = require('./routes');
const { startCustomNotificationScheduler } = require('./services/customNotificationScheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Register API Routes
app.use('/api', routes);

// Serve static frontend client in production
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/assets')) {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'Asset not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Kendana Backend API running on http://localhost:${PORT}`);
  startCustomNotificationScheduler();
});
