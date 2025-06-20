// server/routes/users.js

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateToken = require('../middleware/authMiddleware'); // Ensure this is imported
const multer = require('multer'); // Import multer
const path = require('path');     // Import path
const fs = require('fs');         // Import fs

// --- Multer Storage Configuration for Profile Pictures ---
const profilePicStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'profilePics'); // Save to server/uploads/profilePics
        fs.mkdir(uploadPath, { recursive: true }, (err) => {
            if (err) {
                console.error('Failed to create profile pic upload directory:', err);
                cb(err);
            } else {
                cb(null, uploadPath);
            }
        });
    },
    filename: (req, file, cb) => {
        // Use user ID in filename to ensure unique profile pic per user and easy lookup
        // req.user.userId is set by authenticateToken middleware
        const userId = req.user.userId;
        const fileExtension = path.extname(file.originalname);
        // Ensure filename is unique using timestamp for robustness
        cb(null, `profile-${userId}-${Date.now()}${fileExtension}`);
    }
});

const uploadProfilePic = multer({
    storage: profilePicStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Max 2MB for profile pictures
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for profile pictures!'), false);
        }
    }
});

// --- User API Routes ---

// Get User Profile by ID (for displaying specific user profiles, including logged-in user's profile)
// This route will be called to get a user's data and also to check if the current user is following them.
// The `id` in the URL is the profile user's ID.
router.get('/:id', authenticateToken, userController.getUserProfile); // Renamed from getUserById to match new model function

// Update User Profile (username, bio, profile picture)
router.put('/profile', authenticateToken, uploadProfilePic.single('profilePic'), userController.updateUser);

// Route to search for users by username
router.get('/search', authenticateToken, userController.searchUsers); // NEW

// Route to follow a user
// :userId in the URL is the ID of the user being FOLLOWED
router.post('/:userId/follow', authenticateToken, userController.followUser); // NEW

// Route to unfollow a user
// :userId in the URL is the ID of the user being UNFOLLOWED
router.delete('/:userId/follow', authenticateToken, userController.unfollowUser); // NEW

module.exports = router;