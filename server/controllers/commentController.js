// server/controllers/commentController.js

const pool = require('../models/db');

// --- Create New Comment Controller ---
exports.createComment = async (req, res) => {
    const postId = req.params.postId;
    const { content } = req.body;
    const userId = req.user.userId; // From authenticateToken middleware

    if (!content || content.trim() === '') {
        return res.status(400).json({ error: 'Comment content cannot be empty.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *;',
            [postId, userId, content]
        );
        const newComment = result.rows[0];

        // IMPORTANT: Send a proper JSON response on success
        res.status(201).json({
            message: 'Comment added successfully!',
            comment: {
                id: newComment.id,
                postId: newComment.post_id,
                userId: newComment.user_id,
                content: newComment.content,
                createdAt: newComment.created_at
            }
        });

    } catch (err) {
        console.error('Error creating comment:', err.message);
        res.status(500).json({ error: 'Internal server error while creating comment.' });
    }
};

// --- Get Comments by Post ID Controller ---
exports.getCommentsByPostId = async (req, res) => {
    const postId = req.params.postId;

    try {
        const result = await pool.query(`
            SELECT
                c.id,
                c.content,
                c.created_at,
                u.username,
                u.profile_pic
            FROM
                comments c
            JOIN
                users u ON c.user_id = u.id
            WHERE
                c.post_id = $1
            ORDER BY
                c.created_at ASC;
        `, [postId]);

        res.status(200).json(result.rows);

    } catch (err) {
        console.error(`Error fetching comments for post ${postId}:`, err.message);
        res.status(500).json({ error: 'Internal server error while fetching comments.' });
    }
};