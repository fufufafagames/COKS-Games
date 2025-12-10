const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
console.log('DATABASE_URL length:', url ? url.length : 'undefined');
if (url) {
    console.log('DATABASE_URL starts with:', url.substring(0, 10));
    // Check for spaces or newlines
    console.log('Contains invisible chars?', /[\s\n\r]/.test(url));
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Connection failed:', err);
    } else {
        console.log('Connection successful:', res.rows[0]);
    }
    pool.end();
});
