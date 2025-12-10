const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { isAuthenticated } = require('../middleware/auth');

// Checkout page
router.get('/buy/:slug', isAuthenticated, paymentController.checkout);

// Process payment
router.post('/process', isAuthenticated, paymentController.processPayment);

// Invoice page
router.get('/:order_id/invoice', isAuthenticated, paymentController.invoice);

// Status page
router.get('/:order_id/status', isAuthenticated, paymentController.status);

// Check status (AJAX)
router.get('/:order_id/check', isAuthenticated, paymentController.checkStatus);

// Payment callback from DOKU
// No auth middleware for callback as it comes from external server
router.post('/callback', paymentController.callback);

module.exports = router;
