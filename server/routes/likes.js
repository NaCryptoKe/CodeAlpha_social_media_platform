// server/routes/likes.js

const express = require('express');
const router = express.Router();
const likeController = require('../controllers/likeController'); // Ensure path is correct
const authenticateToken = require('../middleware/authMiddleware'); // Ensure path is correct

// Route to add a like to a post
// POST /api/posts/:postId/like
router.post('/:postId/like', authenticateToken, likeController.addLike);

// Route to remove a like from a post
// DELETE /api/posts/:postId/like
router.delete('/:postId/like', authenticateToken, likeController.removeLike);

module.exports = router;