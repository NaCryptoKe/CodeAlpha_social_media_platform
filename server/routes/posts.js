// server/routes/posts.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authenticateToken = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig');

// Route to get all posts (feed)
router.get('/', authenticateToken, postController.getAllPosts);

// Route to create a new post
router.post('/', authenticateToken, upload.single('image'), postController.createPost);

// Route to get a specific post by ID
router.get('/:id', authenticateToken, postController.getPostById);

// Route to delete a post
router.delete('/:id', authenticateToken, postController.deletePost);

// Route to get posts by a specific user ID (for profile page)
router.get('/user/:userId', authenticateToken, postController.getPostsByUserId); // <--- ADD THIS LINE

module.exports = router;