// server/controllers/postController.js
const postModel = require('../models/postModel'); // Import the new post model
const upload = require('../middleware/multerConfig'); // Assuming multer is used for file uploads

const postController = {
    /**
     * @desc Get all posts for the feed
     * @route GET /posts
     * @access Public (or Authenticated, depending on middleware setup)
     */
    getAllPosts: async (req, res) => {
        // requestingUserId comes from query parameters from frontend
        // Use `req.user.userId` if you *always* want an authenticated user's ID
        // but `req.query.requestingUserId` if the frontend explicitly sends it.
        // I'll keep req.query.requestingUserId as per your frontend code for now.
        const requestingUserId = req.query.requestingUserId || null; // Ensure it's null if not provided

        // Validate requestingUserId if it's not null, ensure it's an integer
        const userIdForQuery = requestingUserId ? parseInt(requestingUserId) : null;
        if (requestingUserId && isNaN(userIdForQuery)) {
            console.warn(`[postController.getAllPosts] Invalid requestingUserId received: ${requestingUserId}`);
            // Decide how to handle this: either return an error or proceed with null
            // For now, we'll proceed with null, meaning no user-specific liked status.
        }


        const offset = parseInt(req.query.offset) || 0;
        const limit = parseInt(req.query.limit) || 10;

        // --- Debug Logs ---
        console.log(`[postController.getAllPosts] Received requestingUserId from frontend: ${requestingUserId}`);
        console.log(`[postController.getAllPosts] Parsed userIdForQuery: ${userIdForQuery}`);
        console.log(`[postController.getAllPosts] Type of userIdForQuery: ${typeof userIdForQuery}`);
        console.log(`[postController.getAllPosts] Query parameters: offset=${offset}, limit=${limit}`);
        // --- End Debug Logs ---

        try {
            // Pass the parsed user ID to the model
            const posts = await postModel.getAllPostsWithDetails(userIdForQuery, offset, limit);
            res.status(200).json(posts);
        } catch (error) {
            console.error('Error in postController.getAllPosts:', error.message);
            res.status(500).json({ error: 'Internal server error while fetching posts.' });
        }
    },

    /**
     * @desc Create a new post
     * @route POST /posts
     * @access Private (Authenticated)
     */
    createPost: async (req, res) => {
        const userId = req.user.userId;
        const { content } = req.body;
        // CORRECTED: The imagePath should reflect where the file is actually saved
        // Multer saves it to: server/uploads/posts/your-filename.jpg
        // For frontend access, it needs to be '/uploads/posts/your-filename.jpg'
        const imagePath = req.file ? `/uploads/posts/${req.file.filename}` : null;

        // --- Add some debug logs here to confirm values ---
        console.log('[postController.createPost] Received userId:', userId);
        console.log('[postController.createPost] Received content:', content);
        console.log('[postController.createPost] Received file:', req.file); // Check if req.file exists
        console.log('[postController.createPost] Constructed imagePath:', imagePath);
        // --- End Debug Logs ---

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
        }
        if (!content && !imagePath) {
            return res.status(400).json({ message: 'Post must have content or an image.' });
        }

        try {
            const newPost = await postModel.createPost(userId, content, imagePath);
            res.status(201).json({ message: 'Post created successfully!', post: newPost });
        } catch (error) {
            console.error('Error in postController.createPost:', error.message);
            // Log full error for more details on server side
            console.error('Full Error Object in postController.createPost:', error);
            res.status(500).json({ error: 'Failed to create post.' });
        }
    },

    /**
     * @desc Get a single post by ID
     * @route GET /posts/:id
     * @access Public (or Authenticated)
     */
    getPostById: async (req, res) => {
        const postId = req.params.id;
        // Try to get requestingUserId from query (if passed explicitly) or from auth token (if logged in)
        const requestingUserId = req.query.requestingUserId || (req.user ? req.user.userId : null);

        if (!postId) {
            return res.status(400).json({ error: 'Post ID is required.' });
        }

        try {
            const post = await postModel.getPostById(postId, requestingUserId);
            if (!post) {
                return res.status(404).json({ message: 'Post not found.' });
            }
            res.status(200).json(post);
        } catch (error) {
            console.error('Error in postController.getPostById:', error.message);
            res.status(500).json({ error: 'Failed to fetch post.' });
        }
    },


    getPostsByUserId: async (req, res) => {
        console.log('[postController.getPostsByUserId] - Entering function');
        const userId = req.params.userId;
        // Ensure requestingUserId is correctly parsed, considering it might be from a query string.
        // If coming from req.user (authenticated user), it's already a number.
        // If coming from req.query, it's a string and needs parsing.
        const requestingUserId = req.query.requestingUserId ? parseInt(req.query.requestingUserId) : null; 

        console.log(`[postController.getPostsByUserId] - userId (param): ${userId}, requestingUserId (query): ${requestingUserId}`);
        console.log(`[postController.getPostsByUserId] - Type of userId: ${typeof userId}, Type of requestingUserId: ${typeof requestingUserId}`);

        if (!userId) {
            console.error('[postController.getPostsByUserId] - Error: User ID is required in URL parameters.');
            return res.status(400).json({ error: 'User ID is required.' });
        }
        if (isNaN(requestingUserId) && requestingUserId !== null) {
            console.error(`[postController.getPostsByUserId] - Warning: Invalid requestingUserId received: ${req.query.requestingUserId}. Proceeding without it.`);
            // You might want to return an error here, but for now, we'll let it proceed as null
        }


        try {
            console.log('[postController.getPostsByUserId] - Calling postModel.getPostsByUserId...');
            const posts = await postModel.getPostsByUserId(userId, requestingUserId);
            console.log(`[postController.getPostsByUserId] - Successfully fetched ${posts.length} posts from model.`);
            res.status(200).json(posts);
        } catch (error) {
            console.error('Error in postController.getPostsByUserId (caught):', error.message);
            // Log the full error object for more detail, especially if it's a stack trace
            console.error('Full Error Object in Controller:', error);
            res.status(500).json({ error: 'Failed to fetch user posts due to a server error.' });
        }
    },

    /**
     * @desc Delete a post
     * @route DELETE /posts/:id
     * @access Private (Authenticated, and must be post owner)
     */
    deletePost: async (req, res) => {
        const postId = req.params.id;
        const userId = req.user.userId; // From authenticateToken middleware

        try {
            const deletedPost = await postModel.deletePost(postId, userId);
            if (!deletedPost) {
                // Return 404 if post not found OR 403 if user is not the owner
                return res.status(404).json({ message: 'Post not found or you are not authorized to delete it.' });
            }
            res.status(200).json({ message: 'Post deleted successfully!', post: deletedPost });
        } catch (error) {
            console.error('Error in postController.deletePost:', error.message);
            res.status(500).json({ error: 'Failed to delete post.' });
        }
    }
};

module.exports = postController;