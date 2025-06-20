// server/models/likeModel.js

const pool = require('./db');

const likeModel = {
    /**
     * @desc Adds a like to a post by a user.
     * @param {number} postId - The ID of the post being liked.
     * @param {number} userId - The ID of the user liking the post.
     * @returns {Object|null} The created like record or null if already exists.
     */
    addLike: async (postId, userId) => {
        try {
            const result = await pool.query(
                'INSERT INTO likes (post_id, user_id) VALUES ($1, $2) RETURNING *',
                [postId, userId]
            );
            return result.rows[0];
        } catch (error) {
            // Check for unique_like constraint violation (user already liked this post)
            if (error.code === '23505') { // PostgreSQL unique violation error code
                console.warn(`User ${userId} already liked post ${postId}.`);
                return null; // Return null to indicate it was already liked
            }
            throw error; // Re-throw other errors
        }
    },

    /**
     * @desc Removes a like from a post by a user.
     * @param {number} postId - The ID of the post.
     * @param {number} userId - The ID of the user.
     * @returns {Object|null} The deleted like record or null if not found.
     */
    removeLike: async (postId, userId) => {
        const result = await pool.query(
            'DELETE FROM likes WHERE post_id = $1 AND user_id = $2 RETURNING *',
            [postId, userId]
        );
        return result.rows[0];
    },

    /**
     * @desc Gets the total count of likes for a specific post.
     * @param {number} postId - The ID of the post.
     * @returns {number} The count of likes.
     */
    getLikesCountForPost: async (postId) => {
        const result = await pool.query(
            'SELECT COUNT(*)::int FROM likes WHERE post_id = $1',
            [postId]
        );
        return result.rows[0].count;
    },

    /**
     * @desc Checks if a specific user has liked a specific post.
     * @param {number} postId - The ID of the post.
     * @param {number} userId - The ID of the user.
     * @returns {boolean} True if the user has liked the post, false otherwise.
     */
    hasUserLikedPost: async (postId, userId) => {
        const result = await pool.query(
            'SELECT 1 FROM likes WHERE post_id = $1 AND user_id = $2',
            [postId, userId]
        );
        return result.rows.length > 0;
    }
};

module.exports = likeModel;