// posts.js

const express = require(`express`);
const router = express.Router();
const postController = require('../controllers/postController');
const authenticateToken = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- Multer Storage Configuration ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..','uploads', 'postImages');
        fs.mkdir(uploadPath, {recursive: true }, (err) => {
            if(err) {
                console.error('Failed to create upload directory:', err);
                cb(err);
            } else {
                cb(null, uploadPath);
            }
        });
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer ({
    storage: storage,
    limits: {fileSize: 5 * 1024 * 1024},
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// --- Post API Routes ---
// Create new post
//router.post('/', authenticateToken, upload.single('image'), postController.createPost);

// Get all posts
//router.get('/', postController.getAllposts)

// Get Users posts
router.get('/user/:userId', postController.getPostsByUserId);

module.exports = router;