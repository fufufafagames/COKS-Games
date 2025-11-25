/**
 * Input Validation Middleware
 * Menggunakan express-validator untuk validasi input
 */

const { body, validationResult } = require("express-validator");

/**
 * Validation rules untuk register
 */
const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 255 })
    .withMessage("Name must be between 2-255 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your password")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
];

/**
 * Validation rules untuk login
 */
const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),
];

/**
 * Validation rules untuk upload game
 */
const gameValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Game title is required")
    .isLength({ min: 3, max: 255 })
    .withMessage("Title must be between 3-255 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 50 })
    .withMessage("Description must be at least 50 characters"),

  body("github_url")
    .trim()
    .notEmpty()
    .withMessage("GitHub URL is required")
    .isURL()
    .withMessage("Please provide a valid URL")
    .matches(/^https:\/\/github\.com\//)
    .withMessage("URL must be from github.com"),

  body("thumbnail_url")
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage("Please provide a valid thumbnail URL"),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .trim(),
];

/**
 * Validation rules untuk rating
 */
const ratingValidation = [
  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1-5"),

  body("review")
    .optional({ checkFalsy: true })
    .isLength({ max: 500 })
    .withMessage("Review must not exceed 500 characters"),
];

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.session.error = errors.array()[0].msg;
    return res.redirect("back");
  }
  next();
};

module.exports = {
  registerValidation,
  loginValidation,
  gameValidation,
  ratingValidation,
  handleValidationErrors,
};
