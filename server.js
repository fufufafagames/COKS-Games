/**
 * FUFUFAFAGAMES - Main Server Entry Point
 * Platform untuk upload dan play game berbasis browser
 */

const express = require("express");
const session = require("express-session");
const methodOverride = require("method-override");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================

// Parse incoming request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, "public")));
app.use('/public', express.static(path.join(__dirname, "public"))); // Support explicit /public path

// Method override untuk support PUT/DELETE dari form HTML
app.use(methodOverride("_method"));

// Session configuration untuk authentication
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fufufafa-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      httpOnly: true,
    },
  })
);

// ==================== VIEW ENGINE ====================

// Set EJS sebagai template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Make session user available di semua views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.session.success || null;
  res.locals.error = req.session.error || null;

  // Clear flash messages setelah ditampilkan
  delete req.session.success;
  delete req.session.error;

  next();
});

// ==================== ROUTES ====================

// Import route modules
const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/games");
const ratingRoutes = require("./routes/ratings");
const profileRoutes = require("./routes/profile");
const paymentRoutes = require("./routes/payment");
const notificationRoutes = require("./routes/notifications");
const pageRoutes = require("./routes/pages");

// Import game controller untuk landing page
const gameController = require("./controllers/gameController");

// Mount routes
app.use("/", pageRoutes); // Mount static pages at root level
app.use("/", authRoutes);
app.use("/games", gameRoutes);
app.use("/ratings", ratingRoutes);
app.use("/profile", profileRoutes);
app.use("/payment", paymentRoutes);
app.use("/api/notifications", notificationRoutes);

// Homepage - Landing page dengan featured games
// UPDATED: Tidak lagi redirect ke /games, tapi render landing page
app.get("/", gameController.landing);

// ==================== ERROR HANDLERS ====================

// 404 handler
app.use((req, res) => {
  res.status(404).render("404", {
    title: "Page Not Found",
    message: "The page you are looking for does not exist.",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).render("error", {
    title: "Server Error",
    message: "Something went wrong on our end. Please try again later.",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// ==================== START SERVER ====================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FUFUFAFAGAMES Server running on:`);
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Network: http://${getLocalIP()}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Ready to play games!`);
  
  // Run cleanup on start
  const cleanupOrphanedFiles = require('./utils/cleanup');
  cleanupOrphanedFiles();

  // Run cleanup periodically (every 1 hour)
  // Run cleanup periodically (every 1 hour)
  setInterval(cleanupOrphanedFiles, 60 * 60 * 1000);

  // Run migration
  const runMigration = require('./utils/migrator');
  runMigration();
});

// Function untuk mendapatkan IP lokal WiFi
function getLocalIP() {
  const os = require("os");
  const interfaces = os.networkInterfaces();

  // Prioritas: WiFi > Ethernet > lainnya
  const priority = ["Wi-Fi", "Ethernet", "en0", "eth0"];

  for (const name of priority) {
    if (interfaces[name]) {
      for (const iface of interfaces[name]) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  }

  // Fallback: cari IPv4 non-internal yang bukan 192.168.56.x (VirtualBox)
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (
        iface.family === "IPv4" &&
        !iface.internal &&
        !iface.address.startsWith("192.168.56")
      ) {
        return iface.address;
      }
    }
  }

  return "localhost";
}
