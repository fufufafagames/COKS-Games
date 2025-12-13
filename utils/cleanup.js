const fs = require('fs');
const path = require('path');
const Game = require('../models/Game');

/**
 * Cleanup orphaned files in uploads directory
 * Deletes files that are not referenced in the database
 */
const cleanupOrphanedFiles = async () => {
    console.log('Starting cleanup of orphaned files...');
    
    try {
        // 1. Get all file paths from database
        // 1. Get all file paths from database
        const { games } = await Game.getAll(); // Fix: destructure games property
        const dbThumbnails = new Set();
        const dbVideos = new Set();

        games.forEach(game => {
            if (game.thumbnail_url && game.thumbnail_url.startsWith('/uploads/thumbnails/')) {
                dbThumbnails.add(path.basename(game.thumbnail_url));
            }
            if (game.video_url && game.video_url.startsWith('/uploads/videos/')) {
                dbVideos.add(path.basename(game.video_url));
            }
        });

        // 2. Cleanup Thumbnails
        const thumbnailDir = path.join(__dirname, '../public/uploads/thumbnails');
        if (fs.existsSync(thumbnailDir)) {
            const files = fs.readdirSync(thumbnailDir);
            let deletedThumbnails = 0;
            
            files.forEach(file => {
                if (!dbThumbnails.has(file) && file !== '.gitkeep') {
                    fs.unlinkSync(path.join(thumbnailDir, file));
                    deletedThumbnails++;
                }
            });
            console.log(`   - Cleaned ${deletedThumbnails} orphaned thumbnails`);
        }

        // 3. Cleanup Videos
        const videoDir = path.join(__dirname, '../public/uploads/videos');
        if (fs.existsSync(videoDir)) {
            const files = fs.readdirSync(videoDir);
            let deletedVideos = 0;
            
            files.forEach(file => {
                if (!dbVideos.has(file) && file !== '.gitkeep') {
                    fs.unlinkSync(path.join(videoDir, file));
                    deletedVideos++;
                }
            });
            console.log(`   - Cleaned ${deletedVideos} orphaned videos`);
        }

        console.log('✅ Cleanup completed successfully');
    } catch (error) {
        console.error('❌ Error during file cleanup:', error);
    }
};

module.exports = cleanupOrphanedFiles;
