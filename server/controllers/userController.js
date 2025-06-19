// userController.js

const pool = require('../models/db');

// --- Get Users by Name Filter ---
exports.getUsers = async (req, res) => {
    const nameFilter = req.query.username; 

    console.log('--- REQUEST RECEIVED FOR /users ---');
    console.log('Received nameFilter:', nameFilter);

    let queryText = 'SELECT id, username, email, bio, profile_pic, first_name, last_name, created_at FROM users';
    let queryParams = [];

    if (nameFilter) {
        queryText += ' WHERE username ILIKE $1';
        queryParams.push(`%${nameFilter}%`);
    }

    queryText += ' ORDER BY id ASC';

    console.log('Constructed queryText:', queryText);
    console.log('Constructed queryParams:', queryParams);

    try {
        const result = await pool.query(queryText, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching users:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};