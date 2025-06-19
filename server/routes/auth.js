// auth.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authMiddleware');

// Register route
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Get Current User's Profile
router.get('/me', authenticateToken, authController.getMe);

// Logout
router.post('/logout', authController.logout);

module.exports = router;