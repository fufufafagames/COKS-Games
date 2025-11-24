/**
 * Game Routes
 * Handle CRUD operations untuk games
 */

const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const {
  gameValidation,
  handleValidationErrors,
} = require("../middleware/validation");
const gameController = require("../controllers/gameController");

const upload = require("../middleware/upload");

// Public routes
router.get("/", gameController.index); // List all games
router.get("/:slug", gameController.show); // Show game detail
router.get("/:slug/play", gameController.play); // Play game

// Protected routes (login required)
router.get("/create/new", isAuthenticated, gameController.create);
router.post(
  "/",
  isAuthenticated,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  gameValidation,
  handleValidationErrors,
  gameController.store
);
router.get("/:slug/edit", isAuthenticated, gameController.edit);
router.put(
  "/:slug",
  isAuthenticated,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  gameValidation,
  handleValidationErrors,
  gameController.update
);
router.delete("/:slug", isAuthenticated, gameController.destroy);

module.exports = router;
