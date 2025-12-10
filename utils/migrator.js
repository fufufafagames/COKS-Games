const { pool } = require('../config/database');

const runMigration = async () => {
    try {
        console.log('Starting payment system migration (In-App)...');

        // 1. Update games table
        await pool.query(`
            ALTER TABLE games 
            ADD COLUMN IF NOT EXISTS price_type VARCHAR(10) DEFAULT 'free',
            ADD COLUMN IF NOT EXISTS price DECIMAL(15, 2) DEFAULT 0;
        `);
        console.log('games table updated.');

        // 2. Create transactions table
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
    } catch (error) {
        console.error('Migration failed:', error);
    }
};

module.exports = runMigration;
