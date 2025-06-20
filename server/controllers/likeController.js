// server/controllers/likeController.js

const likeModel = require('../models/likeModel'); // Ensure path is correct

const likeController = {
    /**
     * @desc Add a like to a post.
     * @route POST /api/posts/:postId/like
     * @access Private (Authenticated)
     */
    addLike: async (req, res) => {
        const postId = req.params.postId;
        const userId = req.user.userId; // From authenticateToken middleware

        if (!postId || !userId) {
            return res.status(400).json({ error: 'Post ID and User ID are required.' });
        }

        try {
            const like = await likeModel.addLike(postId, userId);
            if (like) {
                res.status(201).json({ message: 'Post liked successfully!', like });
            } else {
                // This means the like already existed (due to unique_like constraint)
                res.status(409).json({ message: 'You have already liked this post.' });
            }
        } catch (error) {
            console.error('Error adding like:', error);
            res.status(500).json({ error: 'Failed to like post due to server error.' });
        }
    },

    /**
     * @desc Remove a like from a post (unlike).
     * @route DELETE /api/posts/:postId/like
     * @access Private (Authenticated)
     */
    removeLike: async (req, res) => {
        const postId = req.params.postId;
        const userId = req.user.userId; // From authenticateToken middleware

        if (!postId || !userId) {
            return res.status(400).json({ error: 'Post ID and User ID are required.' });
        }

        try {
            const deletedLike = await likeModel.removeLike(postId, userId);
            if (deletedLike) {
                res.status(200).json({ message: 'Post unliked successfully!', deletedLike });
            } else {
                res.status(404).json({ message: 'Like not found or already removed.' });
            }
        } catch (error) {
            console.error('Error removing like:', error);
            res.status(500).json({ error: 'Failed to unlike post due to server error.' });
        }
    }
};

module.exports = likeController;