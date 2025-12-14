const { pool } = require('../config/database');

const runMigration = async () => {
    try {
        console.log('Starting payment system migration (In-App)...');

        // 1. Update games table
        await pool.query(`
            ALTER TABLE games 
            ADD COLUMN IF NOT EXISTS price_type VARCHAR(10) DEFAULT 'free',
            ADD COLUMN IF NOT EXISTS price DECIMAL(15, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS icon_url VARCHAR(255); 
        `);
        console.log('games table updated (price & icon columns).');

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

        // 3. Create notifications table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('notifications table created.');

        // 4. Create events table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                banner_url VARCHAR(255),
                video_url VARCHAR(255),
                target_url VARCHAR(255),
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('events table created.');

        // 5. Update users table (Ban System)
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS ban_reason TEXT;
        `);
        console.log('users table updated (ban system).');

        // 6. Update events table (Link to Game)
        await pool.query(`
            ALTER TABLE events
            ADD COLUMN IF NOT EXISTS game_id INTEGER REFERENCES games(id) ON DELETE SET NULL;
        `);
        console.log('events table updated (game link).');

        // 7. Seed initial event if empty - DISABLED
        /*
        const eventCheck = await pool.query("SELECT COUNT(*) FROM events");
        if (parseInt(eventCheck.rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO events (title, description, banner_url, video_url, target_url, start_date, is_active)
                VALUES (
                    'Summer Tournament 2025',
                    'Bergabunglah dalam turnamen terbesar musim ini! Dapatkan hadiah total Rp 50.000.000 dan skin eksklusif terbatas. Pendaftaran dibuka untuk semua tier mulai dari Warrior sampai Mythic.',
                    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2qE6IfnqD6qlo_ODmOBKDUgJlEXMmnxIwOA&s',
                    'https://www.youtube.com/embed/O_CycbaPPYk?si=nXGmUQ0IQ6_H8Be6',
                    '/events/summer-2025',
                    NOW(),
                    TRUE
                );
            `);
            console.log('Sample event inserted.');
        }
        */
        // 8. Update games table (Download Config)
        await pool.query(`
            ALTER TABLE games
            ADD COLUMN IF NOT EXISTS download_config TEXT,
            ALTER COLUMN github_url DROP NOT NULL;
        `);
        console.log('games table updated (download_config & nullable github_url).');

        console.log('Event seeding skipped.');

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    }
};

module.exports = runMigration;
