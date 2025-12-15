const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { isAuthenticated, isAdminMiddleware } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// --- Multer Config ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let dir = "public/uploads/misc";
        if (file.fieldname === "banner") dir = "public/uploads/banners";
        if (file.fieldname === "banner") dir = "public/uploads/banners";
        if (file.fieldname === "video") dir = "public/uploads/videos";
        if (file.fieldname === "ad_image") dir = "public/uploads/ads";

        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Unique filename: timestamp-random.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        if (file.fieldname === "banner") {
            if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
                return cb(new Error('Only image files are allowed!'), false);
            }
        }
        if (file.fieldname === "video") {
            if (!file.originalname.match(/\.(mp4|mkv|av1|webm)$/)) {
                return cb(new Error('Only video files are allowed!'), false);
            }
        }
        if (file.fieldname === "ad_image") {
            if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
                return cb(new Error('Only image files are allowed for ads!'), false);
            }
        }
        cb(null, true);
    }
});

const cpUpload = upload.fields([{ name: 'banner', maxCount: 1 }, { name: 'video', maxCount: 1 }]);
const adUpload = upload.single('ad_image');


// Base middleware for all admin routes
router.use(isAuthenticated);
router.use(isAdminMiddleware);

// Dashboard
router.get("/", adminController.dashboard);
router.get("/discounts", adminController.discounts);

// User Management
router.get("/users", adminController.listUsers);
router.post("/users/:userId/ban", adminController.banUser);
router.post("/users/:userId/unban", adminController.unbanUser);

// Event Management
router.get("/events", adminController.listEvents);
router.post("/events", cpUpload, adminController.createEvent);
router.post("/events/:id/update", cpUpload, adminController.updateEvent); 
router.post("/events/:id/activate", adminController.activateEvent);
router.post("/events/:id/delete", adminController.deleteEvent);

// Ad Management
router.get("/ads", adminController.listAds);
router.post("/ads", adUpload, adminController.createAd);
router.post("/ads/:id/activate", adminController.activateAd);
router.post("/ads/:id/delete", adminController.deleteAd);

// Message / Inbox Routes [NEW]
router.get('/messages', adminController.listMessages);
router.post('/messages/:id/delete', adminController.deleteMessage);

module.exports = router;
