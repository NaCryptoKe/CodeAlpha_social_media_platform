// server/controllers/userController.js

const userModel = require('../models/userModel');
const path = require('path'); // For path manipulation
const fs = require('fs');     // For file system operations (e.g., deleting old profile pics)

const userController = {
    /**
     * @desc Get user profile by ID
     * @route GET /users/:id
     * @access Authenticated
     * Fetches a user's full profile including follower/following counts and follow status
     */
    getUserProfile: async (req, res) => {
        const profileUserId = parseInt(req.params.id); // The ID of the user whose profile is being viewed
        const requestingUserId = req.user.userId; // The ID of the authenticated user making the request

        if (isNaN(profileUserId)) {
            return res.status(400).json({ message: 'Invalid user ID provided.' });
        }

        try {
            // Use the new getProfileById that includes follow counts and status
            const userProfile = await userModel.getProfileById(profileUserId, requestingUserId);
            if (!userProfile) {
                return res.status(404).json({ error: 'User not found.' });
            }
            res.status(200).json(userProfile);
        } catch (error) {
            console.error('Error fetching user profile:', error.message);
            res.status(500).json({ error: 'Internal server error.' });
        }
    },

    /**
     * @desc Update user profile (username, bio, profile picture)
     * @route PUT /users/profile
     * @access Private (Authenticated)
     * Requires authenticateToken and uploadProfilePic.single('profilePic') middleware
     * Expected req.body: { username: "string", bio: "string" }
     * Expected req.file (from multer): profilePic file details if uploaded
     */
    updateUser: async (req, res) => {
        const userId = req.user.userId;
        const { username, bio } = req.body;
        let profilePicPath = null;
        let oldProfilePicPath = null;

        try {
            const currentUser = await userModel.findById(userId);
            if (!currentUser) {
                return res.status(404).json({ error: 'User not found for update operation.' });
            }
            oldProfilePicPath = currentUser.profile_pic;

            if (req.file) {
                profilePicPath = `/uploads/profilePics/${req.file.filename}`;

                // Delete old profile picture file if a new one is uploaded and old one exists
                if (oldProfilePicPath && oldProfilePicPath.startsWith('/uploads/profilePics/')) {
                    const absoluteOldPath = path.join(__dirname, '..', '..', oldProfilePicPath);
                    if (fs.existsSync(absoluteOldPath)) {
                        fs.unlink(absoluteOldPath, (unlinkErr) => {
                            if (unlinkErr) console.error('Error deleting old profile picture:', unlinkErr);
                        });
                    }
                }
            } else if (oldProfilePicPath) {
                 profilePicPath = oldProfilePicPath;
            }


            const updateFields = {};
            if (username !== undefined) updateFields.username = username;
            if (bio !== undefined) updateFields.bio = bio;
            // Update profile_pic field only if a new file was uploaded OR if an old one existed and no new one was provided
            // This covers keeping the old pic if no new one is uploaded.
            // If you want to allow setting profilePic to NULL from frontend, you'd need explicit logic.
            if (req.file || (oldProfilePicPath && !req.file)) {
                updateFields.profile_pic = profilePicPath;
            }


            if (Object.keys(updateFields).length === 0) {
                return res.status(400).json({ message: 'No fields provided for update.' });
            }

            const updatedUser = await userModel.updateUser(userId, updateFields);

            if (!updatedUser) {
                return res.status(404).json({ error: 'User not found or update failed.' });
            }

            const { password_hash, ...userData } = updatedUser;
            res.status(200).json({ message: 'Profile updated successfully!', user: userData });

        } catch (error) {
            console.error('Error updating user profile:', error);
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting newly uploaded profile pic after update failure:', unlinkErr);
                });
            }
            res.status(500).json({ error: 'Failed to update profile due to server error.' });
        }
    },

    /**
     * @desc Search for users by username
     * @route GET /users/search?q=:query
     * @access Authenticated
     */
    searchUsers: async (req, res) => {
        const searchQuery = req.query.q;
        const requestingUserId = req.user.userId;

        if (!searchQuery || searchQuery.trim() === '') {
            return res.status(400).json({ message: 'Search query cannot be empty.' });
        }

        try {
            const users = await userModel.searchUsers(searchQuery, requestingUserId);
            res.status(200).json(users);
        } catch (error) {
            console.error('Error in userController.searchUsers:', error.message);
            res.status(500).json({ error: 'Failed to search users.' });
        }
    },

    /**
     * @desc Follow a user
     * @route POST /users/:userId/follow
     * @access Authenticated
     */
    followUser: async (req, res) => {
        const userIdToFollow = parseInt(req.params.userId);
        const followerId = req.user.userId;

        if (isNaN(userIdToFollow)) {
            return res.status(400).json({ message: 'Invalid user ID.' });
        }
        if (userIdToFollow === followerId) {
            return res.status(400).json({ message: 'Cannot follow yourself.' });
        }

        try {
            const result = await userModel.followUser(followerId, userIdToFollow);
            if (result.alreadyFollowing) {
                return res.status(409).json({ message: 'You are already following this user.' });
            }
            res.status(200).json({ message: 'User followed successfully!', follows: result.follows });
        } catch (error) {
            console.error('Error in userController.followUser:', error.message);
            res.status(500).json({ error: 'Failed to follow user.' });
        }
    },

    /**
     * @desc Unfollow a user
     * @route DELETE /users/:userId/follow
     * @access Authenticated
     */
    unfollowUser: async (req, res) => {
        const userIdToUnfollow = parseInt(req.params.userId);
        const followerId = req.user.userId;

        if (isNaN(userIdToUnfollow)) {
            return res.status(400).json({ message: 'Invalid user ID.' });
        }

        try {
            const result = await userModel.unfollowUser(followerId, userIdToUnfollow);
            if (!result) {
                return res.status(404).json({ message: 'You are not following this user.' });
            }
            res.status(200).json({ message: 'User unfollowed successfully!', unfollows: result });
        } catch (error) {
            console.error('Error in userController.unfollowUser:', error.message);
            res.status(500).json({ error: 'Failed to unfollow user.' });
        }
    },
};

module.exports = userController;