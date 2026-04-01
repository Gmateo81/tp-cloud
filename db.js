const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRESQL_ADDON_URI,
});

const initDb = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      due_date DATE,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    const client = await pool.connect();
    await client.query(query);
    console.log('Database initialized successfully');
    client.release();
  } catch (err) {
    console.error('Error initializing database', err);
    process.exit(1);
  }
};

module.exports = { pool, initDb };
