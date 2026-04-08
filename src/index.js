const path = require('path');
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const { Server } = require('socket.io');
const pino = require('pino');

const db = require('./db');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Serve static site files (frontend)
app.use(express.static(path.resolve(__dirname, '..')));

// API endpoints
app.get('/api/candidates', async (req, res) => {
  try {
    const rows = await db.getCandidates();
    res.json(rows);
  } catch (err) {
    logger.error('GET /api/candidates error', err);
    res.status(500).json({ error: 'Failed to load candidates' });
  }
});

app.get('/api/results', async (req, res) => {
  try {
    const rows = await db.getResults();
    res.json(rows);
  } catch (err) {
    logger.error('GET /api/results error', err);
    res.status(500).json({ error: 'Failed to load results' });
  }
});

app.post('/api/candidates', async (req, res) => {
  try {
    const { name, party, imageURL } = req.body || {};
    if (!name || !imageURL) return res.status(400).json({ error: 'name and imageURL are required' });
    const candidate = await db.addCandidate({ name, party, imageURL });
    res.status(201).json(candidate);
  } catch (err) {
    logger.error('POST /api/candidates error', err);
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  logger.info('Socket connected: %s', socket.id);

  socket.on('submitVote', async (candidateId) => {
    try {
      const updated = await db.incrementVote(candidateId);
      io.emit('voteUpdate', updated);
    } catch (err) {
      logger.error('submitVote error', err);
      socket.emit('error', { message: 'Failed to record vote' });
    }
  });

  socket.on('disconnect', () => {
    logger.info('Socket disconnected: %s', socket.id);
  });
});

(async function start() {
  try {
    await db.init();
    const port = process.env.PORT || 3000;
    server.listen(port, () => logger.info(`Server running on http://localhost:${port}`));
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
})();
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection', err);
  process.exit(1);
});
