const db = require('../config/database');
const { Pool } = require('pg');

// Create a separate pool for migration to avoid potential conflicts with the main app pool if needed,
// but since we are running this as a standalone script, we can just use the config. 
// However, the config/database.js exports an instance, so we can require it directly if it works for standalone.
// Actually config/database.js assumes process.env.DATABASE_URL is set.
// Standalone scripts usually need to load dotenv.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
    try {
        console.log('Starting payment system migration...');
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL is not defined in environment variables');
        }
        console.log('DATABASE_URL is defined. connecting...');

        // 1. Update games table
        console.log('Updating games table...');
        await pool.query(`
            ALTER TABLE games 
            ADD COLUMN IF NOT EXISTS price_type VARCHAR(10) DEFAULT 'free',
            ADD COLUMN IF NOT EXISTS price DECIMAL(15, 2) DEFAULT 0;
        `);
        console.log('games table updated.');

        // 2. Create transactions table
        console.log('Creating transactions table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                game_id INTEGER REFERENCES games(id),
                amount DECIMAL(15, 2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed, challenge
                snap_token VARCHAR(255),
                payment_type VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('transactions table created.');

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
