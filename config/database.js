/**
 * Database Configuration - Supabase PostgreSQL Connection
 * Menggunakan pg Pool untuk connection pooling
 */

const { Pool } = require("pg");

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required untuk Supabase
  },
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased to 10s to prevent timeouts
});

// Test connection
pool.on("connect", () => {
  console.log("Database connected successfully");
});

pool.on("error", (err) => {
  console.error("Unexpected database error:", err);
  process.exit(-1);
});

/**
 * Execute SQL query
 * @param {string} text - SQL query string
 * @param {array} params - Query parameters
 * @returns {Promise} Query result
 */
const query = (text, params) => {
  return pool.query(text, params);
};

module.exports = {
  query,
  pool,
};
