const express = require('express');
const cors = require('cors');
const { pool, initDb } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

initDb();

// Health Check
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      app: process.env.APP_NAME,
      database: result ? 'connected' : 'disconnected'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      app: process.env.APP_NAME,
      database: 'disconnected',
      error: err.message
    });
  }
});

// SSE Clients Management
let clients = [];

app.get('/alerts', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };
  clients.push(newClient);

  // Send initial message
  res.write(': connected\n\n');

  // Keep-alive ping every 30s
  const keepAlive = setInterval(() => {
    res.write(': ping\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
    clients = clients.filter(c => c.id !== clientId);
  });
});

// Implementation of TODOs and Notify will follow...

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
