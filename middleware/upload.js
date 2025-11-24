const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = [
    'public/uploads/thumbnails',
    'public/uploads/videos'
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'thumbnail') {
            cb(null, 'public/uploads/thumbnails');
        } else if (file.fieldname === 'video') {
            cb(null, 'public/uploads/videos');
        } else {
            cb(new Error('Invalid field name'), null);
        }
    },
    filename: function (req, file, cb) {
        // Generate unique filename: timestamp-random-originalName
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'thumbnail') {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
            return cb(new Error('Only image files are allowed for thumbnails!'), false);
        }
    } else if (file.fieldname === 'video') {
        // Accept videos only
        if (!file.originalname.match(/\.(mp4|webm|ogg|mov)$/)) {
            return cb(new Error('Only video files are allowed for videos!'), false);
        }
    }
    cb(null, true);
};

// Initialize multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit (adjust as needed)
    }
});

module.exports = upload;
