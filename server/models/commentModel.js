// server/models/commentModel.js

const pool = require('./db');

const commentModel = {
    /**
     * @desc Creates a new comment on a post.
     * @param {number} postId - The ID of the post being commented on.
     * @param {number} userId - The ID of the user making the comment.
     * @param {string} content - The content of the comment.
     * @returns {Object} The created comment record.
     */
    createComment: async (postId, userId, content) => {
        const result = await pool.query(
            'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
            [postId, userId, content]
        );
        return result.rows[0];
    },

    /**
     * @desc Gets all comments for a specific post.
     * @param {number} postId - The ID of the post.
     * @returns {Array<Object>} An array of comment objects, including user details.
     */
    getCommentsForPost: async (postId) => {
        const result = await pool.query(
            `SELECT
                c.id,
                c.post_id,
                c.user_id,
                c.content,
                c.created_at,
                u.username,
                u.profile_pic
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC`,
            [postId]
        );
        return result.rows;
    }
};

module.exports = commentModel;