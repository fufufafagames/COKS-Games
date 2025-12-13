/**
 * Notification Controller
 */

const Notification = require('../models/Notification');

module.exports = {
  // API: Get unread count
  getUnreadCount: async (req, res) => {
    if (!req.session.user) {
      return res.json({ count: 0 });
    }
    const count = await Notification.countUnread(req.session.user.id);
    res.json({ count });
  },

  // API: Mark all as read
  markAsRead: async (req, res) => {
    if (req.session.user) {
      await Notification.markAllAsRead(req.session.user.id);
    }
    res.json({ success: true });
  },
  
  // Create test notification (for debugging/demo)
  // Usage: POST /api/notifications/test
  createTest: async (req, res) => {
      if (req.session.user) {
          await Notification.create(
              req.session.user.id, 
              'system', 
              'Hello! This is a test notification from Fufufafagames.'
          );
          res.json({ success: true });
      } else {
          res.status(401).json({ error: 'Unauthorized' });
      }
  }
};
