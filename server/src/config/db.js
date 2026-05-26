// server/src/config/db.js
// PostgreSQL connection pool — shared across all models
// Uses pg Pool for efficient connection reuse

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'stylesynk',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,                  // max pool connections
  idleTimeoutMillis: 30000, // close idle clients after 30s
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  // Uncomment to debug: console.log('DB connected');
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err.message);
});

// Convenience wrapper — returns rows directly
const query = (text, params) => pool.query(text, params);

// Get a client for multi-statement transactions
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
