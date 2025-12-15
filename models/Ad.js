/**
 * Ad Model
 * Mengatur data iklan/banner di halaman utama
 */
const db = require('../config/database');

module.exports = {
    /**
     * Get All Ads (For Admin)
     */
    getAll: async () => {
        const result = await db.query("SELECT * FROM ads ORDER BY created_at DESC");
        return result.rows;
    },

    /**
     * Get Active Ad (For Homepage)
     * Hanya ambil 1 iklan yang flag is_active = true
     */
    getActive: async (location = 'home_top') => {
        const result = await db.query(
            "SELECT * FROM ads WHERE is_active = TRUE AND location = $1 LIMIT 1", 
            [location]
        );
        return result.rows[0];
    },

    findById: async (id) => {
        const result = await db.query("SELECT * FROM ads WHERE id = $1", [id]);
        return result.rows[0];
    },

    /**
     * Create New Ad
     */
    create: async (data) => {
        const { title, image_url, target_url, location } = data;
        const result = await db.query(
            `INSERT INTO ads (title, image_url, target_url, location, is_active)
             VALUES ($1, $2, $3, $4, FALSE) RETURNING *`,
            [title, image_url, target_url, location]
        );
        return result.rows[0];
    },

    /**
     * Delete Ad
     */
    delete: async (id) => {
        await db.query("DELETE FROM ads WHERE id = $1", [id]);
    },

    /**
     * Toggle Active Status
     * Logic: Matikan semua iklan lain di lokasi yang sama, lalu aktifkan yang dipilih.
     */
    activate: async (id) => {
        // 0. Get the Ad to know its location
        const result = await db.query("SELECT location FROM ads WHERE id = $1", [id]);
        if (result.rows.length === 0) return; // Ad not found

        const location = result.rows[0].location;

        // 1. Matikan semua di lokasi ini
        await db.query("UPDATE ads SET is_active = FALSE WHERE location = $1", [location]);
        
        // 2. Aktifkan ID user
        await db.query("UPDATE ads SET is_active = TRUE WHERE id = $1", [id]);
    },
    
    deactivate: async (id) => {
        await db.query("UPDATE ads SET is_active = FALSE WHERE id = $1", [id]);
    }
};
