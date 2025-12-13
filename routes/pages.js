const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

const db = require('../config/database');

// Search Page
router.get('/search', gameController.searchPage);

// Static pages
router.get('/about', async (req, res) => {
  try {
    const stats = {
      gamesHosted: 0,
      activeGamers: 0,
      totalPlays: 0,
      indieDevs: 0
    };

    // Run parallel queries for efficiency
    const [gamesRes, usersRes, playsRes, devsRes] = await Promise.all([
      db.query("SELECT COUNT(*) FROM games"),
      db.query("SELECT COUNT(*) FROM users"),
      db.query("SELECT COALESCE(SUM(play_count), 0) as total FROM games"),
      db.query("SELECT COUNT(DISTINCT user_id) FROM games")
    ]);

    stats.gamesHosted = parseInt(gamesRes.rows[0].count);
    stats.activeGamers = parseInt(usersRes.rows[0].count);
    stats.totalPlays = parseInt(playsRes.rows[0].total);
    stats.indieDevs = parseInt(devsRes.rows[0].count);

    res.render('pages/about', { 
      title: 'About Fufufafagames',
      page: 'about',
      stats
    });
  } catch (error) {
    console.error('Error fetching about stats:', error);
    res.render('pages/about', { 
      title: 'About Fufufafagames',
      page: 'about',
      stats: { gamesHosted: 0, activeGamers: 0, totalPlays: 0, indieDevs: 0 }
    });
  }
});

const Chat = require('../models/Chat');

router.get('/community', async (req, res) => {
  try {
    const messages = await Chat.getRecent(50);
    res.render('pages/community', { 
      title: 'Community Chat',
      page: 'community',
      user: req.session.user || null,
      messages
    });
  } catch (err) {
    console.error(err);
    res.render('pages/community', { 
      title: 'Community Chat',
      page: 'community',
      user: req.session.user || null,
      messages: []
    });
  }
});

// API Endpoints for Chat
router.get('/api/messages', async (req, res) => {
  try {
    const messages = await Chat.getRecent(50);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/api/messages', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const newChat = await Chat.create(req.session.user.id, message);
    
    // Return complete message object with user info for immediate display
    const completeMessage = {
      ...newChat,
      user_name: req.session.user.name,
      user_avatar: req.session.user.avatar
    };

    res.json(completeMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.get('/faq', (req, res) => {
  res.render('pages/faq', { 
    title: 'FAQ',
    page: 'faq' 
  });
});

module.exports = router;
