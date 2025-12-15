/**
 * Event Model
 */
const db = require("../config/database");

module.exports = {
  /**
   * Get active event
   * @returns {Promise<object|null>} Active event or null
   */
  /**
   * Get active event (Valid Date & Active Flag)
   * @returns {Promise<object|null>} Active event or null
   */
  getActive: async () => {
    try {
      const result = await db.query(
        `SELECT * FROM events 
         WHERE is_active = TRUE 
         AND CURRENT_DATE BETWEEN start_date AND end_date
         ORDER BY created_at DESC LIMIT 1`
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error fetching active event:", error);
      return null;
    }
  },

  /**
   * Get all events
   */
  getAll: async () => {
    const result = await db.query("SELECT * FROM events ORDER BY created_at DESC");
    return result.rows;
  },

  /**
   * Create new event
   */
   create: async (data) => {
    const { title, description, banner_url, video_url, target_url, start_date, end_date, game_id } = data;
    const result = await db.query(
      `INSERT INTO events (title, description, banner_url, video_url, target_url, start_date, end_date, game_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description, banner_url, video_url, target_url, start_date, end_date, game_id]
    );
    return result.rows[0];
  },

  /**
   * Find event by ID
   */
  findById: async (id) => {
    const result = await db.query("SELECT * FROM events WHERE id = $1", [id]);
    return result.rows[0];
  },

  /**
   * Update event
   */
  update: async (id, data) => {
    const { title, description, banner_url, video_url, target_url, start_date, end_date, game_id } = data;
    const result = await db.query(
      `UPDATE events 
       SET title = $1, description = $2, banner_url = $3, video_url = $4, target_url = $5, start_date = $6, end_date = $7, game_id = $8, updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [title, description, banner_url, video_url, target_url, start_date, end_date, game_id, id]
    );
    return result.rows[0];
  },

  /**
   * Find event by Target URL (Generic Page Handler)
   */
  findByTargetUrl: async (url) => {
      // Decode URL partially if needed, or simple match
      // Try exact match first, then partial if needed
      const result = await db.query("SELECT * FROM events WHERE target_url LIKE $1 OR target_url LIKE $2", 
          [url, `%${url}`]
      );
      return result.rows[0];
  },

  /**
   * Delete event
   */
  delete: async (id) => {
    await db.query("DELETE FROM events WHERE id = $1", [id]);
  },

  /**
   * Set Active Event (Toggle)
   */
  toggleActive: async (id) => {
     // 1. Set all to false
     await db.query("UPDATE events SET is_active = FALSE");
     // 2. Set specific id to true
     await db.query("UPDATE events SET is_active = TRUE WHERE id = $1", [id]);
  }
};
