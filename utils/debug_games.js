require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Game = require('../models/Game');
const db = require('../config/database');

const debugGames = async () => {
    try {
        console.log('🔍 Inspecting Games...');
        const games = await Game.getAll();
        
        games.forEach(game => {
            console.log(`ID: ${game.id} | Title: ${game.title} | User: ${game.author_name} (${game.user_id})`);
            console.log(`   Thumbnail: ${game.thumbnail_url}`);
            console.log(`   Video: ${game.video_url}`);
            console.log('-----------------------------------');
        });

        // Find "Horror Game Test"
        const horrorGame = games.find(g => g.title === 'Horror Game Test');
        if (horrorGame) {
            console.log(`🗑️ Found "Horror Game Test" (ID: ${horrorGame.id}). Deleting...`);
            await Game.delete(horrorGame.slug);
            console.log('✅ Deleted "Horror Game Test"');
        } else {
            console.log('ℹ️ "Horror Game Test" not found.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
};

debugGames();
