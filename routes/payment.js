const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const paymentController = require("../controllers/paymentController");

// Payment Details (Buy Page)
router.get("/:slug/details", isAuthenticated, paymentController.details);

// Charge (Get Snap Token)
router.post("/:slug/charge", isAuthenticated, paymentController.charge);

// Invoice / Receipt (Redirect after payment)
router.get("/invoice", isAuthenticated, paymentController.invoice);

// Payment Status History
router.get("/status", isAuthenticated, paymentController.status);

// Webhook notification (No auth middleware because it's server-to-server)
router.post("/notification", paymentController.notification);

module.exports = router;
