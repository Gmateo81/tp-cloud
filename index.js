const express = require('express');
const cors = require('cors');
const { pool, initDb } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

initDb();

// Root Route
app.get('/', (req, res) => {
  res.send("<h1>Voici l'api todo de Gayrard Mateo</h1>");
});

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

// GET /todos
app.get('/todos', async (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM todos';
  const params = [];

  if (status) {
    query += ' WHERE status = $1';
    params.push(status);
  }

  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /todos
app.post('/todos', async (req, res) => {
  const { title, description, due_date } = req.body;
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'title is required and cannot be empty' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO todos (title, description, due_date) VALUES ($1, $2, $3) RETURNING *',
      [title, description, due_date]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /todos/:id
app.patch('/todos/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const fields = Object.keys(updates);
  
  if (fields.length === 0) return res.status(400).json({ error: 'No fields provided' });

  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values = Object.values(updates);

  try {
    const { rows } = await pool.query(
      `UPDATE todos SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Todo not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /todos/:id
app.delete('/todos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM todos WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Todo not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /todos/overdue
app.get('/todos/overdue', async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM todos WHERE status = 'pending' AND due_date < CURRENT_DATE"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /todos/:id/notify
app.post('/todos/:id/notify', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM todos WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Todo not found' });

    const todo = rows[0];
    const eventData = JSON.stringify({
      id: todo.id,
      title: todo.title,
      status: todo.status,
      due_date: todo.due_date
    });

    clients.forEach(c => {
      c.res.write(`event: todo_alert\n`);
      c.res.write(`data: ${eventData}\n\n`);
    });

    res.json({ message: 'Alerte envoyée', listeners: clients.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
