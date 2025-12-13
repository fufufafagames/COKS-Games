const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// All routes prefixed with /api/notifications
router.get('/count', notificationController.getUnreadCount);
router.post('/mark-read', notificationController.markAsRead);
router.post('/test', notificationController.createTest); // For testing

module.exports = router;
