/**
 * Notification Model
 * Handle database operations for notifications
 */

const db = require('../config/database');

module.exports = {
  /**
   * Create a new notification
   * @param {number} userId - User ID to receive notification
   * @param {string} type - Notification type (system, achievement, etc)
   * @param {string} message - Notification content
   */
  create: async (userId, type, message) => {
    try {
      await db.query(
        `INSERT INTO notifications (user_id, type, message, is_read, created_at)
         VALUES ($1, $2, $3, false, NOW())`,
        [userId, type, message]
      );
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  },

  /**
   * Get unread notifications count for a user
   * @param {number} userId
   */
  countUnread: async (userId) => {
    try {
      const result = await db.query(
        `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
        [userId]
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error counting notifications:', error);
      return 0;
    }
  },

  /**
   * Mark all notifications as read for a user
   * @param {number} userId
   */
  markAllAsRead: async (userId) => {
    try {
      await db.query(
        `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
        [userId]
      );
    } catch (error) {
      console.error('Error marking notifications read:', error);
    }
  },

  /**
   * Get recent notifications (limit 10)
   * @param {number} userId
   */
  getRecent: async (userId) => {
    try {
      const result = await db.query(
        `SELECT * FROM notifications 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }
};
