/**
 * User Model
 * Handle semua operasi database untuk users
 * Merged version: Best of both worlds (Original + MGX features)
 */

const db = require("../config/database");
const bcrypt = require("bcryptjs");

module.exports = {
  // ==================== USER CREATION ====================

  /**
   * Create user baru (dengan password)
   * @param {object} userData - Data user (name, email, password)
   * @returns {Promise<object>} User yang baru dibuat
   */
  create: async (userData) => {
    const { name, email, password } = userData;

    // Hash password sebelum disimpan (SECURITY!)
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (name, email, password, created_at, updated_at) 
       VALUES ($1, $2, $3, NOW(), NOW()) 
       RETURNING id, name, email, avatar, bio, created_at`,
      [name, email, hashedPassword]
    );

    return result.rows[0];
  },

  /**
   * Create OAuth user (tanpa password)
   * Untuk user yang login via Google/Discord/Github
   * @param {object} userData - Data user (name, email, avatar)
   * @returns {Promise<object>} User yang baru dibuat
   */
  createOAuth: async (userData) => {
    const { name, email, avatar } = userData;

    const result = await db.query(
      `INSERT INTO users (name, email, password, avatar, created_at, updated_at) 
       VALUES ($1, $2, NULL, $3, NOW(), NOW()) 
       RETURNING id, name, email, avatar, bio, created_at`,
      [name, email, avatar]
    );

    return result.rows[0];
  },

  // ==================== USER LOOKUP ====================

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<object|null>} User object atau null
   */
  findByEmail: async (email) => {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    return result.rows[0] || null;
  },

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<object|null>} User object atau null
   */
  findById: async (id) => {
    const result = await db.query(
      "SELECT id, name, email, avatar, bio, created_at, is_banned, ban_reason FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Get all users (for admin dashboard)
   * @returns {Promise<Array>} Array of users
   */
  getAll: async () => {
    const result = await db.query(
      `SELECT id, name, email, avatar, created_at 
       FROM users 
       ORDER BY created_at DESC`
    );
    return result.rows;
  },

  // ==================== PASSWORD MANAGEMENT ====================

  /**
   * Verify password
   * @param {string} plainPassword - Password dari input user
   * @param {string} hashedPassword - Hashed password dari database
   * @returns {Promise<boolean>} True jika password cocok
   */
  verifyPassword: async (plainPassword, hashedPassword) => {
    if (!hashedPassword) {
      return false; // OAuth users don't have password
    }
    return await bcrypt.compare(plainPassword, hashedPassword);
  },

  /**
   * Update password (untuk reset password feature)
   * @param {number} userId - User ID
   * @param {string} newPassword - Password baru (plaintext)
   * @returns {Promise<void>}
   */
  updatePassword: async (userId, newPassword) => {
    // Hash password baru sebelum disimpan (SECURITY!)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      "UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
      [hashedPassword, userId]
    );
  },

  // ==================== USER PROFILE ====================

  /**
   * Update user profile
   * @param {number} id - User ID
   * @param {object} updateData - Data yang akan diupdate
   * @returns {Promise<object>} Updated user
   */
  update: async (id, updateData) => {
    const { name, avatar, bio } = updateData;

    const result = await db.query(
      `UPDATE users 
       SET name = $1, avatar = $2, bio = $3, updated_at = NOW() 
       WHERE id = $4 
       RETURNING id, name, email, avatar, bio`,
      [name, avatar, bio, id]
    );

    return result.rows[0];
  },

  /**
   * Update user avatar only
   * @param {number} id - User ID
   * @param {string} avatar - Avatar URL
   * @returns {Promise<object>} Updated user
   */
  updateAvatar: async (id, avatar) => {
    const result = await db.query(
      `UPDATE users 
       SET avatar = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, name, email, avatar, bio`,
      [avatar, id]
    );

    return result.rows[0];
  },

  // ==================== USER STATISTICS ====================

  /**
   * Get user stats (total uploads, total plays received)
   * Untuk ditampilkan di profile page
   * @param {number} userId - User ID
   * @returns {Promise<object>} User stats
   */
  getStats: async (userId) => {
    const result = await db.query(
      `SELECT 
        COUNT(games.id) as total_uploads,
        COALESCE(SUM(games.play_count), 0) as total_plays
       FROM games 
       WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0];
  },

  // ==================== ADMIN OPERATIONS ====================

  /**
   * Delete user (for admin only)
   * CATATAN: Pertimbangkan untuk soft delete atau cascade delete games dulu
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  delete: async (userId) => {
    // TODO: Implementasi cascade delete games atau soft delete
    await db.query("DELETE FROM users WHERE id = $1", [userId]);
  },

  /**
   * Ban user
   * @param {number} userId - User ID
   * @param {string} reason - Alasan ban
   */
  ban: async (userId, reason) => {
    await db.query(
      "UPDATE users SET is_banned = TRUE, ban_reason = $1, updated_at = NOW() WHERE id = $2",
      [reason, userId]
    );
  },

  /**
   * Unban user
   * @param {number} userId - User ID
   */
  unban: async (userId) => {
    await db.query(
      "UPDATE users SET is_banned = FALSE, ban_reason = NULL, updated_at = NOW() WHERE id = $1",
      [userId]
    );
  },

  /**
   * Check if user is admin
   * Helper function untuk cek admin berdasarkan email
   * @param {object} user - User object
   * @returns {boolean} True jika user adalah admin
   */
  isAdmin: (user) => {
    const ADMIN_EMAILS = ["fufufafagames@gmail.com", "fufufafagames.id"];

    return ADMIN_EMAILS.includes(user.email);
  },

  /**
   * Set reset token for password recovery
   * @param {string} email - User email
   * @param {string} token - Reset Token
   * @param {Date} expires - Expiration date
   */
  setResetToken: async (email, token, expires) => {
     await db.query(
        "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3",
        [token, expires, email]
     );
  },

  /**
   * Find user by valid reset token
   * @param {string} token 
   * @returns {object|null}
   */
  findByResetToken: async (token) => {
      const result = await db.query(
          "SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()",
          [token]
      );
      return result.rows[0] || null;
  },

  /**
   * Clear reset token after successful reset
   * @param {number} userId 
   */
  clearResetToken: async (userId) => {
      await db.query(
          "UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = $1",
          [userId]
      );
  }
};
