/**
 * Transaction Model
 * Handle semua operasi database untuk transactions
 */

const db = require("../config/database");

module.exports = {
  /**
   * Create new transaction
   * @param {object} data - Transaction data
   * @returns {Promise<object>} Created transaction
   */
  create: async (data) => {
    const { user_id, game_id, amount, status, snap_token, payment_type } = data;

    const result = await db.query(
      `INSERT INTO transactions 
            (user_id, game_id, amount, status, snap_token, payment_type, created_at, updated_at) 
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
            RETURNING *`,
      [user_id, game_id, amount, status, snap_token, payment_type]
    );

    return result.rows[0];
  },

  /**
   * Find by ID
   * @param {number} id - Transaction ID
   */
  findById: async (id) => {
    const result = await db.query("SELECT * FROM transactions WHERE id = $1", [id]);
    return result.rows[0] || null;
  },

  /**
   * Find by Snap Token (useful for callbacks)
   * @param {string} token
   */
  findBySnapToken: async (token) => {
    const result = await db.query("SELECT * FROM transactions WHERE snap_token = $1", [token]);
    return result.rows[0] || null;
  },

  /**
   * Update status
   * @param {string} snap_token
   * @param {string} status
   * @param {string} payment_type
   */
  updateStatus: async (snap_token, status, payment_type) => {
    const result = await db.query(
      `UPDATE transactions 
             SET status = $1, payment_type = $2, updated_at = NOW() 
             WHERE snap_token = $3 
             RETURNING *`,
      [status, payment_type, snap_token]
    );
    return result.rows[0];
  },

  /**
   * Check if user has purchased a game
   * @param {number} userId
   * @param {number} gameId
   */
  hasPurchased: async (userId, gameId) => {
    const result = await db.query(
      `SELECT id FROM transactions 
             WHERE user_id = $1 AND game_id = $2 AND status = 'success'
             ORDER BY created_at DESC LIMIT 1`,
      [userId, gameId]
    );
    return result.rows.length > 0;
  },

  /**
   * Get transaction history for user
   * @param {number} userId
   */
  getByUserId: async (userId) => {
    const result = await db.query(
      `SELECT t.*, g.title as game_title, g.slug as game_slug, g.thumbnail_url 
             FROM transactions t
             JOIN games g ON t.game_id = g.id
             WHERE t.user_id = $1
             ORDER BY t.created_at DESC`,
      [userId]
    );
    return result.rows;
  }
};
