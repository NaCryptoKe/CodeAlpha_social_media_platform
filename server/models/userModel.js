// server/models/userModel.js

const pool = require('./db');
const bcrypt = require('bcryptjs'); // Good to keep for password updates

const userModel = {
    /**
     * Finds a user by their ID (basic user data, no follow counts/status).
     * @param {number} id - The user ID.
     * @returns {Object|null} The user object (excluding password_hash) or null if not found.
     */
    findById: async (id) => {
        try {
            const result = await pool.query('SELECT id, username, email, profile_pic, bio, created_at FROM users WHERE id = $1', [id]);
            return result.rows[0];
        } catch (error) {
            console.error('Error in userModel.findById:', error.message);
            throw error;
        }
    },

    /**
     * Finds a user by their username (includes password_hash for auth).
     * @param {string} username - The username.
     * @returns {Object|null} The user object (including password_hash) or null if not found.
     */
    findByUsername: async (username) => {
        try {
            const result = await pool.query('SELECT id, username, email, password_hash, profile_pic, bio, created_at FROM users WHERE username = $1', [username]);
            return result.rows[0];
        } catch (error) {
            console.error('Error in userModel.findByUsername:', error.message);
            throw error;
        }
    },

    /**
     * Creates a new user in the database.
     * @param {string} username
     * @param {string} passwordHash - Hashed password.
     * @returns {Object} The newly created user object.
     */
    createUser: async (username, passwordHash) => {
        try {
            const result = await pool.query(
                'INSERT INTO users (username, password_hash, created_at) VALUES ($1, $2, NOW()) RETURNING id, username, created_at',
                [username, passwordHash]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error in userModel.createUser:', error.message);
            throw error;
        }
    },

    /**
     * @desc Updates a user's profile information.
     * @param {number} id - The user ID to update.
     * @param {Object} updateFields - An object containing fields to update (e.g., { username: 'newname', bio: 'new bio', profile_pic: '/path/to/pic.jpg' }).
     * @returns {Object|null} The updated user object or null if not found/updated.
     */
    updateUser: async (id, updateFields) => {
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        if (updateFields.username !== undefined) {
            setClauses.push(`username = $${paramIndex++}`);
            values.push(updateFields.username);
        }
        if (updateFields.bio !== undefined) {
            setClauses.push(`bio = $${paramIndex++}`);
            values.push(updateFields.bio);
        }
        if (updateFields.profile_pic !== undefined) {
            setClauses.push(`profile_pic = $${paramIndex++}`);
            values.push(updateFields.profile_pic);
        }

        if (setClauses.length === 0) {
            return null; // No fields to update
        }

        values.push(id); // Add userId for WHERE clause

        const query = `
            UPDATE users
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id, username, bio, profile_pic, created_at;
        `;
        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error in userModel.updateUser:', error.message);
            throw error;
        }
    },

    /**
     * Gets a user's profile data including follower/following counts
     * and whether the requesting user is following this profile.
     * @param {number} profileUserId - The ID of the user whose profile is being viewed.
     * @param {number|null} requestingUserId - The ID of the user viewing the profile (for follow status).
     * @returns {Object|null} The profile data.
     */
    getProfileById: async (profileUserId, requestingUserId = null) => {
        try {
            let query;
            let queryParams = [profileUserId]; // $1 will always be profileUserId

            // Conditionally build the SELECT clause for 'is_following'
            if (requestingUserId !== null && !isNaN(requestingUserId)) {
                query = `
                    SELECT
                        u.id,
                        u.username,
                        u.profile_pic,
                        u.bio,
                        u.created_at,
                        COALESCE(followers.count, 0)::int AS follower_count,
                        COALESCE(following.count, 0)::int AS following_count,
                        COALESCE(posts.count, 0)::int AS post_count, -- ADDED: Post count
                        CASE WHEN EXISTS (SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id) THEN TRUE ELSE FALSE END AS is_following
                    FROM
                        users u
                    LEFT JOIN (
                        SELECT following_id, COUNT(*) AS count
                        FROM follows
                        WHERE following_id = $1
                        GROUP BY following_id
                    ) AS followers ON u.id = followers.following_id
                    LEFT JOIN (
                        SELECT follower_id, COUNT(*) AS count
                        FROM follows
                        WHERE follower_id = $1
                        GROUP BY follower_id
                    ) AS following ON u.id = following.follower_id
                    LEFT JOIN ( -- ADDED: Join for post count
                        SELECT user_id, COUNT(*) AS count
                        FROM posts
                        WHERE user_id = $1
                        GROUP BY user_id
                    ) AS posts ON u.id = posts.user_id
                    WHERE
                        u.id = $1;
                `;
                queryParams.push(requestingUserId); // Add requestingUserId as $2
            } else {
                // If requestingUserId is null or invalid, we don't need to check follows table
                // Set is_following to FALSE directly.
                query = `
                    SELECT
                        u.id,
                        u.username,
                        u.profile_pic,
                        u.bio,
                        u.created_at,
                        COALESCE(followers.count, 0)::int AS follower_count,
                        COALESCE(following.count, 0)::int AS following_count,
                        COALESCE(posts.count, 0)::int AS post_count, -- ADDED: Post count
                        FALSE AS is_following -- Always false if no requesting user
                    FROM
                        users u
                    LEFT JOIN (
                        SELECT following_id, COUNT(*) AS count
                        FROM follows
                        WHERE following_id = $1
                        GROUP BY following_id
                    ) AS followers ON u.id = followers.following_id
                    LEFT JOIN (
                        SELECT follower_id, COUNT(*) AS count
                        FROM follows
                        WHERE follower_id = $1
                        GROUP BY follower_id
                    ) AS following ON u.id = following.follower_id
                    LEFT JOIN ( -- ADDED: Join for post count
                        SELECT user_id, COUNT(*) AS count
                        FROM posts
                        WHERE user_id = $1
                        GROUP BY user_id
                    ) AS posts ON u.id = posts.user_id
                    WHERE
                        u.id = $1;
                `;
                // Only profileUserId is passed, so only $1 is used
            }

            const result = await pool.query(query, queryParams);
            return result.rows[0];
        } catch (error) {
            console.error('Error in userModel.getProfileById:', error.message);
            throw error;
        }
    },

    /**
     * Searches for users by username (case-insensitive, partial match).
     * Includes whether the requesting user is following the found users.
     * @param {string} query - The search string.
     * @param {number} requestingUserId - The ID of the user performing the search.
     * @returns {Array<Object>} An array of user objects.
     */
    searchUsers: async (query, requestingUserId) => {
        try {
            const searchQuery = `%${query.toLowerCase()}%`; // For case-insensitive partial match
            const result = await pool.query(
                `
                SELECT
                    u.id,
                    u.username,
                    u.profile_pic,
                    u.bio,
                    CASE WHEN EXISTS (SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id) THEN TRUE ELSE FALSE END AS is_following
                FROM
                    users u
                WHERE
                    LOWER(u.username) LIKE $1
                    AND u.id != $2 -- Exclude the requesting user from search results
                ORDER BY
                    u.username ASC
                LIMIT 20; -- Limit results for performance
                `,
                [searchQuery, requestingUserId]
            );
            return result.rows;
        } catch (error) {
            console.error('Error in userModel.searchUsers:', error.message);
            throw error;
        }
    },

    /**
     * Records a follow relationship.
     * @param {number} followerId - The ID of the user performing the follow.
     * @param {number} followingId - The ID of the user being followed.
     * @returns {Object} { success: boolean, alreadyFollowing: boolean, follows: Object }
     */
    followUser: async (followerId, followingId) => {
        try {
            // Check if already following
            const checkQuery = await pool.query(
                'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
                [followerId, followingId]
            );

            if (checkQuery.rows.length > 0) {
                return { success: false, alreadyFollowing: true };
            }

            // Insert new follow relationship
            const result = await pool.query(
                'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) RETURNING *',
                [followerId, followingId]
            );
            return { success: true, alreadyFollowing: false, follows: result.rows[0] };
        } catch (error) {
            console.error('Error in userModel.followUser:', error.message);
            throw error;
        }
    },

    /**
     * Removes a follow relationship.
     * @param {number} followerId - The ID of the user performing the unfollow.
     * @param {number} followingId - The ID of the user being unfollowed.
     * @returns {Object|null} The unfollowed relationship object if successful, otherwise null.
     */
    unfollowUser: async (followerId, followingId) => {
        try {
            const result = await pool.query(
                'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING *',
                [followerId, followingId]
            );
            return result.rows[0]; // Returns the deleted row if successful, or undefined
        } catch (error) {
            console.error('Error in userModel.unfollowUser:', error.message);
            throw error;
        }
    }
};

module.exports = userModel;