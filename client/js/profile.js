// client/js/profile.js

document.addEventListener('DOMContentLoaded', async () => {
    const usernameDisplay = document.getElementById('usernameDisplay');
    const bioDisplay = document.getElementById('bioDisplay');
    const profilePicDisplay = document.getElementById('profilePicDisplay');
    const userPostsContainer = document.querySelector('.user-posts-container');
    const profileMessageElement = document.getElementById('profileMessage'); // For general page messages

    // Navigation buttons
    const feedNavLink = document.getElementById('feedNavLink');
    const settingsButton = document.getElementById('settingsButton'); // Floating button
    const dmButton = document.getElementById('dmButton');           // Floating button
    const logoutButton = document.getElementById('logoutButton');   // Now in nav

    const authToken = sessionStorage.getItem('authToken');
    let currentUserId = null; // To store the ID of the logged-in user

    // --- Navigation Handlers ---
    if (feedNavLink) {
        feedNavLink.addEventListener('click', () => {
            window.location.href = '/feed.html';
        });
    }

    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            window.location.href = '/setting.html'; // Navigate to the new settings page
        });
    }

    if (dmButton) {
        dmButton.addEventListener('click', () => {
            alert('DM functionality coming soon! Stay tuned.');
        });
    }

    // Logout button handler (moved to nav)
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            if (typeof window.logoutUser === 'function') {
                window.logoutUser(); // Call global logout function from auth.js
            } else {
                sessionStorage.clear();
                alert('Logged out successfully!');
                window.location.href = '/login.html';
            }
        });
    }

    // --- Function to fetch and display current user profile ---
    async function fetchAndDisplayUserProfile() {
        if (!authToken) {
            console.warn('No authentication token found. Redirecting to login page.');
            profileMessageElement.textContent = 'You are not logged in. Redirecting...';
            profileMessageElement.classList.add('error-message');
            setTimeout(() => { window.location.href = '/login.html'; }, 1500);
            return false; // Indicate that fetching failed due to no token
        }

        try {
            // First, decode the token to get the user ID
            const tokenParts = authToken.split('.');
            if (tokenParts.length !== 3) {
                throw new Error('Invalid token format');
            }
            const payload = JSON.parse(atob(tokenParts[1])); // Decode base64 payload
            currentUserId = payload.userId; // Assuming your JWT payload has a userId field

            if (!currentUserId) {
                profileMessageElement.textContent = 'Could not determine user ID from token. Please re-login.';
                profileMessageElement.classList.add('error-message');
                return false;
            }

            // Now, fetch user data from the backend
            const response = await fetch(`http://localhost:3000/users/${currentUserId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const user = await response.json();

            if (response.ok) {
                // Display user data
                usernameDisplay.textContent = user.username || 'N/A';
                bioDisplay.textContent = user.bio || 'No bio yet.';
                profilePicDisplay.src = user.profile_pic || 'https://placehold.co/150x150/cccccc/333333?text=User';
                // Add onerror for profile pic
                profilePicDisplay.onerror = function() {
                    this.onerror=null;
                    this.src='https://placehold.co/150x150/cccccc/333333?text=User';
                };

                // NEW: Update counts (ensure these elements exist in your HTML)
                if (document.getElementById('postCount')) {
                    document.getElementById('postCount').textContent = user.post_count !== undefined ? user.post_count : '0';
                }
                if (document.getElementById('followerCount')) {
                    document.getElementById('followerCount').textContent = user.follower_count !== undefined ? user.follower_count : '0';
                }
                if (document.getElementById('followingCount')) {
                    document.getElementById('followingCount').textContent = user.following_count !== undefined ? user.following_count : '0';
                }

                // Also fetch and display user's posts
                await fetchAndDisplayUserPosts(currentUserId);
                return true; // Indicate success
            } else {
                profileMessageElement.textContent = user.error || 'Failed to load user profile.';
                profileMessageElement.classList.add('error-message');
                return false;
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            profileMessageElement.textContent = 'Network error or invalid token. Could not load profile.';
            profileMessageElement.classList.add('error-message');
            // If token is truly invalid, redirect to login
            if (error.message === 'Invalid token format' || error.message.includes('Unexpected token')) {
                 setTimeout(() => { window.location.href = '/login.html'; }, 1500);
            }
            return false;
        }
    }

    // You can remove the separate fetchProfileData function as its logic is merged into fetchAndDisplayUserProfile
    // If you absolutely need a separate function for fetching, ensure it's called with a valid userId and token.
    // For now, I'm assuming fetchAndDisplayUserProfile covers the primary profile data display.

    // --- Function to fetch and display user's own posts ---
    async function fetchAndDisplayUserPosts(userId) {
        if (!userPostsContainer) return;
        userPostsContainer.innerHTML = '<p class="loading-posts">Loading your posts...</p>'; // Show loading message

        try {
            // Pass requestingUserId so backend can determine has_liked status
            const response = await fetch(`http://localhost:3000/posts/user/${userId}?requestingUserId=${currentUserId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const posts = await response.json();

            if (response.ok) {
                userPostsContainer.innerHTML = ''; // Clear loading message

                if (posts && posts.length > 0) {
                    for (const post of posts) { // Use for...of for async operations if needed
                        const postDiv = document.createElement('div');
                        postDiv.className = 'feed-post'; // Reusing feed-post class for consistent styling
                        postDiv.setAttribute('data-post-id', post.id);

                        // Ensure post.has_liked is correctly coming from backend (0 or 1)
                        const likedClass = post.has_liked == 1 ? 'liked' : '';
                        const heartIcon = post.has_liked == 1 ? '❤️' : '🤍';

                        postDiv.innerHTML = `
                            <div class="post-media-and-content">
                                <div class="feed-post-header">
                                    <img src="${post.profile_pic || 'https://placehold.co/45x45/cccccc/333333?text=User'}" alt="${post.username}'s profile picture" onerror="this.onerror=null;this.src='https://placehold.co/45x45/cccccc/333333?text=User';"/>
                                    <span class="username">@${post.username || 'unknown'}</span>
                                </div>

                                ${post.image_path ? `
                                    <div class="feed-post-image">
                                        <img src="${post.image_path}" alt="Post image for ${post.username}" onerror="this.onerror=null; this.src='https://placehold.co/600x300?text=Image+Error';"/>
                                    </div>
                                ` : ''}

                                <div class="feed-post-text">
                                    ${post.content ? `<p>${post.content}</p>` : ''}
                                </div>
                                <div class="feed-post-meta">
                                    Posted on ${new Date(post.created_at).toLocaleString()}
                                </div>
                                <div class="interaction-buttons">
                                    <button class="interaction-button like-button ${likedClass}" data-post-id="${post.id}">
                                        <span class="icon heart-icon">${heartIcon}</span>
                                        <span class="label">Like</span>
                                    </button>
                                    <button class="interaction-button share-button" data-post-id="${post.id}">
                                        <span class="icon">🔗</span>
                                        <span class="label">Share</span>
                                    </button>
                                    <button class="interaction-button save-button" data-post-id="${post.id}">
                                        <span class="icon">💾</span>
                                        <span class="label">Save</span>
                                    </button>
                                </div>
                            </div>

                            <div class="post-interactions-and-comments">
                                <div class="comment-stats">
                                    <span class="like-count-display">${post.like_count} Likes</span>
                                    <span class="comment-count-display">${post.comment_count} Comments</span>
                                </div>
                                <div class="comments-section">
                                    <div class="comments-list" data-post-id="${post.id}">
                                        <p class="loading-comments">Loading comments...</p>
                                    </div>
                                    <div class="comment-input-area">
                                        <img src="${profilePicDisplay.src}" alt="Your profile picture" class="current-user-pic" onerror="this.onerror=null;this.src='https://placehold.co/35x35/cccccc/333333?text=You';"/>
                                        <textarea class="comment-input" placeholder="Add a comment..." rows="1"></textarea>
                                        <button class="comment-submit-button" data-post-id="${post.id}">Post</button>
                                    </div>
                                </div>
                            </div>
                        `;
                        userPostsContainer.appendChild(postDiv);
                        await fetchAndDisplayCommentsForPost(post.id); // Fetch comments for each post
                    }
                    attachPostEventListeners(); // Attach event listeners to newly created posts
                } else {
                    userPostsContainer.innerHTML = '<p class="no-posts">You have no posts yet. Time to create one!</p>';
                }
            } else {
                userPostsContainer.innerHTML = `<p class="error-message">Error loading your posts: ${posts.error || 'Unknown error'}</p>`;
            }
        } catch (error) {
            console.error('Network or parsing error fetching user posts:', error);
            userPostsContainer.innerHTML = '<p class="error-message">Could not load your posts due to a network error.</p>';
        }
    }

    // --- Function to fetch and display comments for a specific post (reused from feed.js) ---
    async function fetchAndDisplayCommentsForPost(postId) {
        const commentsListDiv = document.querySelector(`.comments-list[data-post-id="${postId}"]`);
        if (!commentsListDiv) return;

        commentsListDiv.innerHTML = '<p class="loading-comments">Loading comments...</p>';

        try {
            const response = await fetch(`http://localhost:3000/posts/${postId}/comments`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const comments = await response.json();

            if (response.ok) {
                commentsListDiv.innerHTML = '';

                if (comments && comments.length > 0) {
                    comments.forEach(comment => {
                        const commentItem = document.createElement('div');
                        commentItem.className = 'comment-item';
                        commentItem.innerHTML = `
                            <div class="comment-header">
                                <img src="${comment.profile_pic || 'https://placehold.co/30x30/cccccc/333333?text=User'}" alt="${comment.username}'s profile picture" onerror="this.onerror=null;this.src='https://placehold.co/30x30/cccccc/333333?text=User';"/>
                                <span class="comment-author">@${comment.username || 'unknown'}</span>
                            </div>
                            <span class="comment-content">${comment.content}</span>
                            <span class="comment-date">${new Date(comment.created_at).toLocaleString()}</span>
                        `;
                        commentsListDiv.appendChild(commentItem);
                    });
                } else {
                    commentsListDiv.innerHTML = '<p class="no-comments">No comments yet.</p>';
                }
            } else {
                commentsListDiv.innerHTML = `<p class="error-comments">Error loading comments: ${comments.error || 'Unknown error'}</p`;
            }
        } catch (error) {
            console.error(`Error fetching comments for post ${postId}:`, error);
            commentsListDiv.innerHTML = '<p class="error-comments">Could not load comments.</p>';
        }
    }

    // --- Function to attach event listeners to dynamically created post elements (reused from feed.js) ---
    function attachPostEventListeners() {
        const likeButtons = document.querySelectorAll('.like-button');
        const saveButtons = document.querySelectorAll('.save-button');
        const shareButtons = document.querySelectorAll('.share-button');
        const commentSubmitButtons = document.querySelectorAll('.comment-submit-button');
        const commentInputAreas = document.querySelectorAll('.comment-input');

        likeButtons.forEach(button => {
            button.removeEventListener('click', handleLikeButtonClick);
            button.addEventListener('click', handleLikeButtonClick);
        });

        saveButtons.forEach(button => {
            button.removeEventListener('click', handleSaveButtonClick);
            button.addEventListener('click', handleSaveButtonClick);
        });

        shareButtons.forEach(button => {
            button.removeEventListener('click', handleShareButtonClick);
            button.addEventListener('click', handleShareButtonClick);
        });

        commentSubmitButtons.forEach(button => {
            button.removeEventListener('click', handleSubmitCommentClick);
            button.addEventListener('click', handleSubmitCommentClick);
        });

        commentInputAreas.forEach(input => {
            input.removeEventListener('keydown', handleCommentInputKeydown);
            input.addEventListener('keydown', handleCommentInputKeydown);
            input.addEventListener('input', autoResizeTextarea);
        });
    }

    // --- Handle Like/Unlike Button Click (reused from feed.js) ---
    async function handleLikeButtonClick(event) {
        if (!authToken) {
            alert('Please log in to like posts.');
            window.location.href = '/login.html';
            return;
        }

        const button = event.currentTarget;
        const postId = button.dataset.postId;
        const heartIcon = button.querySelector('.heart-icon');

        const postDiv = button.closest('.feed-post');
        const likeCountDisplay = postDiv.querySelector('.like-count-display');

        if (!likeCountDisplay) {
            console.error('Like count display element not found for post:', postId);
            return;
        }

        const currentLikesText = likeCountDisplay.textContent.split(' ')[0];
        let currentLikes = parseInt(currentLikesText);

        const isLiked = button.classList.contains('liked');
        const method = isLiked ? 'DELETE' : 'POST';
        const url = `http://localhost:3000/posts/${postId}/like`;

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                if (method === 'POST') {
                    button.classList.add('liked');
                    heartIcon.textContent = '❤️';
                    currentLikes++;
                } else { // DELETE
                    button.classList.remove('liked');
                    heartIcon.textContent = '🤍';
                    currentLikes--;
                }
                likeCountDisplay.textContent = `${currentLikes} Likes`;
                console.log(result.message);
            } else {
                alert(`Error: ${result.message || result.error || 'Failed to update like status.'}`);
                console.error('Like/Unlike failed:', result);
            }
        } catch (error) {
            console.error('Network error during like/unlike or JSON parsing failed:', error);
            alert('Could not connect to the server or failed to process response for like/unlike.');
        }
    }

    // --- Handle Save Button Click (Placeholder) (reused from feed.js) ---
    function handleSaveButtonClick(event) {
        const postId = event.currentTarget.dataset.postId;
        alert(`Save Post ID: ${postId} - This functionality is coming soon!`);
    }

    // --- Handle Share Button Click (Placeholder) (reused from feed.js) ---
    function handleShareButtonClick(event) {
        const postId = event.currentTarget.dataset.postId;
        const postUrl = `${window.location.origin}/posts/${postId}`;

        if (navigator.share) {
            navigator.share({
                title: 'Check out this post!',
                text: 'See what I found on the social app.',
                url: postUrl,
            }).then(() => console.log('Successful share'))
              .catch((error) => console.log('Error sharing', error));
        } else {
            navigator.clipboard.writeText(postUrl)
                .then(() => alert(`Post link copied to clipboard: ${postUrl}`))
                .catch(err => console.error('Failed to copy text: ', err));
        }
    }

    // --- Handle Comment Input Keydown (for Enter/Shift+Enter) (reused from feed.js) ---
    async function handleCommentInputKeydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const submitButton = event.target.closest('.comment-input-area').querySelector('.comment-submit-button');
            if (submitButton) {
                submitButton.click();
            }
        }
    }

    // --- Auto-resize Textarea (reused from feed.js) ---
    function autoResizeTextarea(event) {
        const textarea = event.target;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    // --- Handle Comment Submit Button Click (reused from feed.js) ---
    async function handleSubmitCommentClick(event) {
        if (!authToken) {
            alert('Please log in to comment.');
            window.location.href = '/login.html';
            return;
        }

        const button = event.currentTarget;
        const postId = button.dataset.postId;
        const postDiv = button.closest('.feed-post');
        const commentInput = postDiv.querySelector('.comment-input');
        const content = commentInput.value.trim();

        if (content === '') {
            alert('Comment cannot be empty.');
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/posts/${postId}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ content: content })
            });

            const result = await response.json();

            if (response.ok) {
                commentInput.value = '';
                commentInput.style.height = 'auto';

                await fetchAndDisplayCommentsForPost(postId);

                const commentCountDisplay = postDiv.querySelector('.comment-count-display');
                let currentComments = parseInt(commentCountDisplay.textContent.split(' ')[0]);
                commentCountDisplay.textContent = `${currentComments + 1} Comments`;

            } else {
                alert(`Error adding comment: ${result.message || result.error || 'Failed to add comment.'}`);
            }
        } catch (error) {
            console.error('Network or JSON parsing error submitting comment:', error);
            alert('Could not connect to the server or failed to process response for comment.');
        }
    }

    // --- Initial Load ---
    // Call the main function to fetch and display profile data.
    // It will handle the redirection if no token is found.
    await fetchAndDisplayUserProfile();
});