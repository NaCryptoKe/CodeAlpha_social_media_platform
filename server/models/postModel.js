// server/models/postModel.js
const pool = require('./db'); // Assuming './db' correctly exports your PostgreSQL pool

const postModel = {
    /**
     * Fetches all posts with associated user info, like count, comment count,
     * and a flag indicating if the requesting user has liked each post.
     * @param {number|null} requestingUserId - The ID of the user requesting the posts, or null if not authenticated.
     * @param {number} offset - For pagination, the number of records to skip.
     * @param {number} limit - For pagination, the maximum number of records to return.
     * @returns {Array} An array of post objects.
     */
    getAllPostsWithDetails: async (requestingUserId, offset, limit) => {
        try {
            // The $1 parameter will be requestingUserId.
            // Using a separate LEFT JOIN (l_user) for the requesting user's like status
            // makes the query more explicit for the has_liked calculation.
            const query = `
                SELECT
                    p.id,
                    p.user_id,
                    u.username,
                    u.profile_pic,
                    p.content,
                    p.image_path,
                    p.created_at,
                    COUNT(DISTINCT l.id)::int AS like_count,
                    COUNT(DISTINCT c.id)::int AS comment_count,
                    MAX(CASE WHEN l_user.user_id = $1 THEN 1 ELSE 0 END)::int AS has_liked
                FROM
                    posts p
                JOIN
                    users u ON p.user_id = u.id
                LEFT JOIN
                    likes l ON p.id = l.post_id
                LEFT JOIN
                    comments c ON p.id = c.post_id
                LEFT JOIN
                    likes l_user ON p.id = l_user.post_id AND l_user.user_id = $1
                GROUP BY
                    p.id, u.username, u.profile_pic
                ORDER BY
                    p.created_at DESC
                OFFSET $2
                LIMIT $3;
            `;
            const result = await pool.query(query, [requestingUserId, offset, limit]);
            return result.rows;
        } catch (error) {
            console.error('Error in postModel.getAllPostsWithDetails:', error.message);
            throw error;
        }
    },

    /**
     * Creates a new post record in the database.
     * @param {number} userId - The ID of the user creating the post.
     * @param {string} content - The text content of the post.
     * @param {string} [imagePath] - Optional path to the uploaded image.
     * @returns {Object} The newly created post object.
     */
    createPost: async (userId, content, imagePath = null) => {
        try {
            const result = await pool.query(
                'INSERT INTO posts (user_id, content, image_path) VALUES ($1, $2, $3) RETURNING *',
                [userId, content, imagePath]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error in postModel.createPost:', error.message);
            throw error;
        }
    },

    /**
     * Gets a single post by its ID, with user details, like count, comment count,
     * and indicates if a specific requesting user has liked the post.
     * @param {number} postId - The ID of the post to fetch.
     * @param {number|null} requestingUserId - The ID of the user viewing the post (for 'has_liked' flag).
     * @returns {Object|null} The post object if found, otherwise null.
     */
    getPostById: async (postId, requestingUserId = null) => {
        try {
            const query = `
                SELECT
                    p.id,
                    p.user_id,
                    u.username,
                    u.profile_pic,
                    p.content,
                    p.image_path,
                    p.created_at,
                    COUNT(DISTINCT l.id)::int AS like_count,
                    COUNT(DISTINCT c.id)::int AS comment_count,
                    MAX(CASE WHEN l_user.user_id = $2 THEN 1 ELSE 0 END)::int AS has_liked
                FROM
                    posts p
                JOIN
                    users u ON p.user_id = u.id
                LEFT JOIN
                    likes l ON p.id = l.post_id
                LEFT JOIN
                    comments c ON p.id = c.post_id
                LEFT JOIN
                    likes l_user ON p.id = l_user.post_id AND l_user.user_id = $2
                WHERE
                    p.id = $1
                GROUP BY
                    p.id, u.username, u.profile_pic;
            `;
            const result = await pool.query(query, [postId, requestingUserId]);
            return result.rows[0]; // Return the first row, or undefined if not found
        } catch (error) {
            console.error('Error in postModel.getPostById:', error.message);
            throw error;
        }
    },

    // server/models/postModel.js (inside the postModel object)

    /**
     * Gets posts by a specific user, with user details, like counts, comment counts,
     * and indicates if a specific requesting user has liked each post.
     * @param {number} userId - The ID of the user whose posts are being fetched.
     * @param {number|null} requestingUserId - The ID of the user viewing the posts (for 'has_liked' flag).
     * @returns {Array<Object>} An array of post objects.
     */
    getPostsByUserId: async (userId, requestingUserId = null) => {
        console.log('[postModel.getPostsByUserId] - Entering function');
        const parsedRequestingUserId = requestingUserId ? parseInt(requestingUserId) : null;
        
        console.log(`[postModel.getPostsByUserId] - userId: ${userId}, parsedRequestingUserId: ${parsedRequestingUserId}`);
        console.log(`[postModel.getPostsByUserId] - Type of userId: ${typeof userId}, Type of parsedRequestingUserId: ${typeof parsedRequestingUserId}`);

        let selectClauseForHasLiked = `0::int AS has_liked`;
        let leftJoinForLikesUser = ''; // This is for the requesting user's like status
        let queryValues = [userId]; // $1 will always be the userId whose posts we are fetching

        // Conditionally build parts of the query and values based on requestingUserId
        // This is for the 'has_liked' flag which needs a specific user's like
        if (parsedRequestingUserId !== null && !isNaN(parsedRequestingUserId)) {
            selectClauseForHasLiked = `MAX(CASE WHEN l_user.user_id = $2 THEN 1 ELSE 0 END)::int AS has_liked`;
            leftJoinForLikesUser = `LEFT JOIN likes l_user ON p.id = l_user.post_id AND l_user.user_id = $2`;
            queryValues.push(parsedRequestingUserId); // Add $2 if a valid requestingUserId exists
        }

        const query = `
            SELECT
                p.id,
                p.user_id,
                u.username,
                u.profile_pic,
                p.content,
                p.image_path,
                p.created_at,
                COUNT(DISTINCT l.id)::int AS like_count,      -- Direct aggregate for all likes
                COUNT(DISTINCT c.id)::int AS comment_count,   -- Direct aggregate for all comments
                ${selectClauseForHasLiked}                    -- Conditional has_liked aggregate
            FROM
                posts p
            JOIN
                users u ON p.user_id = u.id
            LEFT JOIN
                likes l ON p.id = l.post_id                   -- Join for counting all likes
            LEFT JOIN
                comments c ON p.id = c.post_id                -- Join for counting all comments
            ${leftJoinForLikesUser}                           -- Conditional join for specific user's like
            WHERE
                p.user_id = $1
            GROUP BY
                p.id,
                p.user_id,
                p.content,
                p.image_path,
                p.created_at,
                u.username,
                u.profile_pic
            ORDER BY
                p.created_at DESC;
        `;
        
        console.log('[postModel.getPostsByUserId] - Generated SQL Query:');
        console.log(query);
        console.log('[postModel.getPostsByUserId] - Query Values:', queryValues);

        try {
            console.log('[postModel.getPostsByUserId] - Executing database query...');
            const result = await pool.query(query, queryValues);
            console.log(`[postModel.getPostsByUserId] - Query successful. Rows returned: ${result.rows.length}`);
            return result.rows;
        } catch (error) {
            console.error('Error in postModel.getPostsByUserId (caught during query):', error.message);
            console.error('Full SQL Error Object in Model:', error);
            throw error;
        }
    },

    /**
     * Deletes a post by its ID and ensures the requesting user is the owner.
     * @param {number} postId - The ID of the post to delete.
     * @param {number} userId - The ID of the user attempting to delete the post.
     * @returns {Object|null} The deleted post object if successful, otherwise null.
     */
    deletePost: async (postId, userId) => {
        try {
            const result = await pool.query('DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING *', [postId, userId]);
            return result.rows[0];
        } catch (error) {
            console.error('Error in postModel.deletePost:', error.message);
            throw error;
        }
    }
};

module.exports = postModel;