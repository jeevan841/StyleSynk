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
  connectionTimeoutMillis: 5000, // 5 seconds for EC2 under load
});

pool.on('connect', () => {
  // Uncomment to debug: console.log('DB connected');
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err.message);
});

/**
 * Test database connection
 * @returns {Promise<boolean>} true if connected, false otherwise
 */
const testConnection = async () => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    return false;
  }
};

/**
 * Execute a parameterized query
 * @param {string} text - SQL query with $1, $2, etc. placeholders
 * @param {Array} params - Array of parameter values
 * @returns {Promise<Object>} Query result object with rows property
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a client for multi-statement transactions
 * Must call client.release() in finally block after use
 * @returns {Promise<Object>} PostgreSQL client from pool
 */
const getClient = () => pool.connect();

/**
 * Gracefully close all pool connections
 * Should be called on process termination from app.js
 * @returns {Promise<void>}
 */
const closePool = async () => {
  try {
    await pool.end();
    console.log('Database pool closed gracefully');
  } catch (error) {
    console.error('Error closing database pool:', error.message);
  }
};

// Test connection on startup
testConnection()
  .then((connected) => {
    if (connected) {
      console.log('✓ PostgreSQL connection pool initialized');
    } else {
      console.error('⚠️  PostgreSQL connection failed - check credentials');
    }
  })
  .catch((err) => {
    console.error('Database initialization error:', err.message);
  });

module.exports = { query, getClient, pool, testConnection, closePool };

// Made with Bob
