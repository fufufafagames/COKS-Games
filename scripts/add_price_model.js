const db = require('../config/database');

async function runMigration() {
    try {
        console.log('Running migration: Add price_model to games table...');
        
        // Add price_model column if it doesn't exist
        await db.query(`
            ALTER TABLE games 
            ADD COLUMN IF NOT EXISTS price_model VARCHAR(50) DEFAULT 'Free';
        `);
        
        console.log('Migration successful: price_model column added.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
