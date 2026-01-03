const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    const sqlPath = path.join(__dirname, 'init-database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const statements = sql.split(';').filter(s => s.trim());
    for (const statement of statements) {
      await pool.query(statement);
    }
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error.message);
  }
}

module.exports = { pool, initializeDatabase };
