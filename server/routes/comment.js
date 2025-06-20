// server/routes/comment.js (should be in server/routes/)

const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const authenticateToken = require('../middleware/authMiddleware');

// Route to create a new comment on a post
// This path '/:postId/comment' combines with '/posts' from app.js to form /posts/:postId/comment
router.post('/:postId/comment', authenticateToken, commentController.createComment);

// Route to get all comments for a specific post
router.get('/:postId/comments', authenticateToken, commentController.getCommentsByPostId);

module.exports = router;