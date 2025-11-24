require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrate() {
  try {
    console.log('Adding video_url column to games table...');
    
    await pool.query(`
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS video_url TEXT;
    `);
    
    console.log('Successfully added video_url column!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
