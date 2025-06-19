// postController.js

const pool = require('../models/db');
const path = require('path');
const fs = require('fs/promises');

// --- Get Posts by User ID Controller ---
exports.getPostsByUserId = async (req, res) => {
    const userId = req.params.userId;

    console.log(`Fetching posts for user ID:  ${userId}`);

    try {
        const result = await pool.query(`
            SELECT
                p.id,
                p.user_id,
                p.content,
                p.image_path,
                p.created_at,
                u.username,
                u.profile_pic
            FROM
                posts p
            JOIN
                users u ON p.user_id = u.id
            WHERE
                p.user_id = $1
            ORDER BY
                p.created_at DESC;
            `, [userId]);

            res.status(200).json(result.rows);
    } catch (err) {
        console.error(`Error fetching posts for user ${userId}:`, err.message);
        res.status(500).json({ error: 'Internal server error while fetching user posts.' });
    }
};