const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pino = require('./utils/logger');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic health
app.get('/healthz', (req, res) => res.json({ status: 'ok' }));

app.use('/api/v1', routes);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
