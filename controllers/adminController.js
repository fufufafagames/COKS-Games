/**
 * Admin Controller
 * Handle Dashboard, User Management, and Site Monitoring
 */

const User = require("../models/User");
const Game = require("../models/Game");
const Event = require("../models/Event");
const Ad = require("../models/Ad");
const Transaction = require("../models/Transaction");
const fs = require('fs');
const path = require('path');
const db = require("../config/database");

module.exports = {
  // ==================== DASHBOARD ====================
  
  /**
   * Admin Dashboard specific implementation
   */
  dashboard: async (req, res) => {
    try {
      // 1. Get Quick Stats
      const [userCount, gameCount, playCount] = await Promise.all([
        db.query("SELECT COUNT(*) FROM users"),
        db.query("SELECT COUNT(*) FROM games"),
        db.query("SELECT COALESCE(SUM(play_count), 0) as total FROM games")
      ]);

      const stats = {
        users: parseInt(userCount.rows[0].count),
        games: parseInt(gameCount.rows[0].count),
        plays: parseInt(playCount.rows[0].total)
      };

      // 2. Get Recent Users (Limit 5)
      const recentUsersResult = await db.query(
        "SELECT id, name, email, avatar, created_at, is_banned FROM users ORDER BY created_at DESC LIMIT 5"
      );

      res.render("admin/dashboard", {
        title: "Admin Dashboard",
        page: "dashboard",
        layout: "admin/layout",
        stats,
        recentUsers: recentUsersResult.rows
      });
    } catch (error) {
      console.error("Admin Dashboard Error:", error);
      res.render("error", { 
        title: "Error",
        message: "Failed to load admin dashboard", 
        error 
      });
    }
  },

  // ==================== USER MANAGEMENT ====================

  /**
   * List All Users
   */
  listUsers: async (req, res) => {
    try {
      // Fetch all users
      // Note: In production, you'd want pagination here.
      const users = await User.getAll(); // Ensure User.getAll returns is_banned column if strictly needed there, or duplicate query here if not.
      // User.getAll currently doesn't fetch is_banned, let's fix that query or use a custom one here.
      
      const result = await db.query(`
        SELECT id, name, email, avatar, created_at, is_banned, ban_reason 
        FROM users 
        ORDER BY created_at DESC
      `);
      
      res.render("admin/users", {
        title: "User Management",
        page: "users",
        layout: "admin/layout",
        users: result.rows
      });
    } catch (error) {
      console.error("List Users Error:", error);
      res.status(500).send("Server Error");
    }
  },

  /**
   * Ban User
   */
  banUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      
      // Prevent banning self
      if (parseInt(userId) === req.session.user.id) {
          req.session.error = "You cannot ban yourself!";
          return res.redirect("/admin/users");
      }

      await User.ban(userId, reason || "Violation of community rules");
      
      req.session.success = "User has been banned successfully.";
      res.redirect("/admin/users");
    } catch (error) {
      console.error("Ban User Error:", error);
      req.session.error = "Failed to ban user.";
      res.redirect("/admin/users");
    }
  },

  /**
   * Unban User
   */
  unbanUser: async (req, res) => {
    try {
      const { userId } = req.params;
      
      await User.unban(userId);
      
      req.session.success = "User has been unbanned.";
      res.redirect("/admin/users");
    } catch (error) {
      console.error("Unban User Error:", error);
      req.session.error = "Failed to unban user.";
      res.redirect("/admin/users");
    }
  },

  // ==================== DISCOUNT MANAGEMENT ====================

  /**
   * List Discount Winners
   */
  discounts: async (req, res) => {
    try {
      const winners = await Transaction.getDiscountWinners();
      
      res.render("admin/discounts", {
        title: "Discount Winners",
        page: "discounts",
        layout: "admin/layout",
        winners
      });
    } catch (error) {
      console.error("Discount Winners Error:", error);
      res.status(500).send("Server Error");
    }
  },

  // ==================== EVENT MANAGEMENT ====================

  /**
   * List All Events
   */
  listEvents: async (req, res) => {
    try {
      const events = await Event.getAll();
      const gamesResult = await require('../config/database').query(`
          SELECT games.id, games.title, games.thumbnail_url, users.name as developer 
          FROM games 
          LEFT JOIN users ON games.user_id = users.id 
          ORDER BY games.title ASC
      `);
      
      res.render("admin/events", {
        title: "Event Management",
        page: "events",
        events,
        games: gamesResult.rows
      });
    } catch (error) {
      console.error("List Events Error:", error);
      res.status(500).send("Server Error");
    }
  },

  /**
   * Create Event
   */
  /**
   * Create Event
   */
  createEvent: async (req, res) => {
    try {
      let { title, description, banner_url, video_url, start_date, end_date } = req.body;
      
      // Auto-generate target_url (Slugify)
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const target_url = `/events/${slug}`;

      // Handle File Uploads
      if (req.files) {
          if (req.files.banner) {
              banner_url = '/' + req.files.banner[0].path.replace(/\\/g, '/').replace(/^public\//, '');
          }
          if (req.files.video) {
              video_url = '/' + req.files.video[0].path.replace(/\\/g, '/').replace(/^public\//, '');
          }
      }
      
      // Game ID is removed per requirement
      const game_id = null;

      await Event.create({ title, description, banner_url, video_url, target_url, start_date, end_date, game_id });
      req.session.success = "Event created successfully!";
      res.redirect("/admin/events");
    } catch (error) {
      console.error("Create Event Error:", error);
      req.session.error = "Failed to create event.";
      res.redirect("/admin/events");
    }
  },

  /**
   * Update Event
   */
  updateEvent: async (req, res) => {
      try {
          const { id } = req.params;
          let { title, description, banner_url, video_url, start_date, end_date } = req.body;
          
          // Auto-generate target_url (Slugify)
          const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          const target_url = `/events/${slug}`;

          // Fetch old event for cleanup
          const oldEvent = await Event.findById(id);

          // Handle File Uploads
          if (req.files) {
              if (req.files.banner) {
                  // Delete old banner if exists and is local
                  if(oldEvent && oldEvent.banner_url && !oldEvent.banner_url.startsWith('http')) {
                      const oldPath = path.join(__dirname, '../public', oldEvent.banner_url);
                      if(fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                  }
                  banner_url = '/' + req.files.banner[0].path.replace(/\\/g, '/').replace(/^public\//, '');
              }
              if (req.files.video) {
                   // Delete old video if exists and is local
                  if(oldEvent && oldEvent.video_url && !oldEvent.video_url.startsWith('http')) {
                      const oldPath = path.join(__dirname, '../public', oldEvent.video_url);
                      if(fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                  }
                  video_url = '/' + req.files.video[0].path.replace(/\\/g, '/').replace(/^public\//, '');
              }
          }

          const game_id = null;

          await Event.update(id, { title, description, banner_url, video_url, target_url, start_date, end_date, game_id });
          req.session.success = "Event updated successfully!";
          res.redirect("/admin/events");
      } catch (error) {
          console.error("Update Event Error:", error);
          req.session.error = "Failed to update event.";
          res.redirect("/admin/events");
      }
  },

  /**
   * Activate Event
   */
  activateEvent: async (req, res) => {
    try {
      const { id } = req.params;
      await Event.toggleActive(id);
      req.session.success = "Event activated!";
      res.redirect("/admin/events");
    } catch (error) {
       console.error("Activate Event Error:", error);
       req.session.error = "Failed to activate event.";
       res.redirect("/admin/events");
    }
  },

  /**
   * Delete Event
   */
  deleteEvent: async (req, res) => {
      try {
          const event = await Event.findById(req.params.id);
          if (event) {
              // Delete files
              if (event.banner_url && event.banner_url.startsWith('/uploads/')) {
                  const fs = require('fs');
                  const path = require('path');
                  const bannerPath = path.join(__dirname, '../public', event.banner_url);
                  if (fs.existsSync(bannerPath)) fs.unlinkSync(bannerPath);
              }
              if (event.video_url && event.video_url.startsWith('/uploads/')) {
                  const fs = require('fs');
                  const path = require('path');
                  const videoPath = path.join(__dirname, '../public', event.video_url);
                  if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
              }
              
              await Event.delete(req.params.id);
              req.session.success = "Event deleted successfully.";
          }
          res.redirect("/admin/events");
      } catch (error) {
          console.error("Delete Event Error:", error);
          res.status(500).send("Server Error");
      }
  },

  // ==================== AD MANAGEMENT ====================

  listAds: async (req, res) => {
      try {
          const Ad = require('../models/Ad'); // Assuming Ad model is not globally available
          const ads = await Ad.getAll();
          res.render("admin/ads", {
              title: "Ad Management",
              page: "ads",
              ads
          });
      } catch (error) {
          console.error("List Ads Error:", error);
          res.status(500).send("Server Error");
      }
  },

  createAd: async (req, res) => {
      try {
          const Ad = require('../models/Ad'); // Assuming Ad model is not globally available
          const { title, target_url, location } = req.body;
          let image_url = '';

          if (req.file) {
              image_url = '/' + req.file.path.replace(/\\/g, '/').replace(/^public\//, '');
          }

          if (!image_url) {
              req.session.error = "Ad image is required!";
              return res.redirect("/admin/ads");
          }

          await Ad.create({ title, image_url, target_url, location });
          req.session.success = "Ad created successfully!";
          res.redirect("/admin/ads");
      } catch (error) {
          console.error("Create Ad Error:", error);
          req.session.error = "Failed to create ad.";
          res.redirect("/admin/ads");
      }
  },

  activateAd: async (req, res) => {
      try {
          const Ad = require('../models/Ad'); // Assuming Ad model is not globally available
          await Ad.activate(req.params.id); // Also disables others in same location
          req.session.success = "Ad activated!";
          res.redirect("/admin/ads");
      } catch (error) {
          console.error("Activate Ad Error:", error);
          res.redirect("/admin/ads");
      }
  },

  deleteAd: async (req, res) => {
      try {
          const id = req.params.id;
          const ad = await Ad.findById(id);
          if (ad) {
               // Delete physical file
               const fs = require('fs');
               const path = require('path');
               if (ad.image_url && ad.image_url.startsWith('/uploads/')) {
                   const filePath = path.join(__dirname, '..', 'public', ad.image_url);
                   if (fs.existsSync(filePath)) {
                       fs.unlinkSync(filePath);
                   }
               }
              await Ad.delete(id);
              req.session.success = "Ad deleted successfully";
          } else {
              req.session.error = "Ad not found";
          }
          res.redirect('/admin/ads');
      } catch (error) {
         console.error(error);
         req.session.error = "Failed to delete ad";
         res.redirect('/admin/ads');
      }
  },

  // ================= MESSAGE / INBOX =================

  listMessages: async (req, res) => {
      try {
          const Message = require('../models/Message');
          const messages = await Message.getAll();
          res.render('admin/messages', { 
              messages, 
              currentUrl: '/admin/messages',
              title: 'Inbox Messages',
              page: 'messages'
          });
      } catch (error) {
          console.error(error);
          res.redirect('/admin');
      }
  },

  deleteMessage: async (req, res) => {
      try {
          const Message = require('../models/Message');
          await Message.delete(req.params.id);
          req.session.success = "Message deleted successfully";
          res.redirect('/admin/messages');
      } catch (error) {
          console.error(error);
          req.session.error = "Failed to delete message";
          res.redirect('/admin/messages');
      }
  }
};
