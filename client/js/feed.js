// client/js/feed.js

document.addEventListener('DOMContentLoaded', async () => {
    const postsContainer = document.getElementById('postsContainer'); // Assuming you have a container for feed posts
    const feedMessageElement = document.getElementById('feedMessage'); // For general page messages

    // Navigation buttons (assuming these are present on the feed page)
    const profileNavLink = document.getElementById('profileNavLink');
    const settingsButton = document.getElementById('settingsButton');
    const dmButton = document.getElementById('dmButton');
    const logoutButton = document.getElementById('logoutButton');

    // Search elements
    const userSearchInput = document.getElementById('userSearchInput');
    const searchButton = document.getElementById('searchButton');
    const searchResultsContainer = document.getElementById('searchResultsContainer'); // Container for user search results

    const authToken = sessionStorage.getItem('authToken');
    let currentUserId = null; // Will be set after token decoding

    // --- Initial Authentication Check and User ID Extraction ---
    if (!authToken) {
        console.warn('No authentication token found. Redirecting to login page.');
        if (feedMessageElement) {
            feedMessageElement.textContent = 'You are not logged in. Redirecting...';
            feedMessageElement.classList.add('error-message');
        }
        setTimeout(() => { window.location.href = '/login.html'; }, 1500);
        return; // Stop execution if no token
    }

    try {
        const tokenParts = authToken.split('.');
        if (tokenParts.length !== 3) {
            throw new Error('Invalid token format');
        }
        const payload = JSON.parse(atob(tokenParts[1]));
        currentUserId = payload.userId;

        if (!currentUserId) {
            if (feedMessageElement) {
                feedMessageElement.textContent = 'Could not determine user ID from token. Please re-login.';
                feedMessageElement.classList.add('error-message');
            }
            return;
        }
    } catch (error) {
        console.error('Error decoding token on feed page:', error);
        if (feedMessageElement) {
            feedMessageElement.textContent = 'Invalid token. Redirecting to login...';
            feedMessageElement.classList.add('error-message');
        }
        setTimeout(() => { window.location.href = '/login.html'; }, 1500);
        return;
    }


    // --- Navigation Handlers ---
    if (profileNavLink) {
        profileNavLink.addEventListener('click', () => {
            window.location.href = '/profile.html'; // Or /profile.html?userId=${currentUserId} if dynamic
        });
    }

    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            window.location.href = '/setting.html';
        });
    }

    if (dmButton) {
        dmButton.addEventListener('click', () => {
            alert('DM functionality coming soon! Stay tuned.');
        });
    }

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


    // --- Function to fetch and display FEED posts ---
    async function fetchAndDisplayFeedPosts() {
        if (!postsContainer) return;
        postsContainer.innerHTML = '<p class="loading-posts">Loading feed...</p>';

        try {
            const response = await fetch(`http://localhost:3000/posts?requestingUserId=${currentUserId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const posts = await response.json();

            if (response.ok) {
                postsContainer.innerHTML = '';
                if (posts && posts.length > 0) {
                    posts.forEach(post => {
                        const postDiv = createPostElement(post); // Reusing logic from profile.js, or create a common function
                        postsContainer.appendChild(postDiv);
                        // No need to fetch comments here unless you want them loaded by default for all feed posts
                    });
                    attachPostEventListeners(); // Attach listeners after all posts are added
                } else {
                    postsContainer.innerHTML = '<p class="no-posts">No posts in your feed yet. Start following users!</p>';
                }
            } else {
                postsContainer.innerHTML = `<p class="error-message">Error loading feed: ${posts.error || 'Unknown error'}</p>`;
            }
        } catch (error) {
            console.error('Network or parsing error fetching feed posts:', error);
            postsContainer.innerHTML = '<p class="error-message">Could not load feed due to a network error.</p>';
        }
    }

    // --- Helper function to create a post element (reused from profile.js for consistency) ---
    function createPostElement(post) {
        const postDiv = document.createElement('div');
        postDiv.className = 'feed-post';
        postDiv.setAttribute('data-post-id', post.id);

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
                        <img src="${sessionStorage.getItem('currentUserProfilePic') || 'https://placehold.co/35x35/cccccc/333333?text=You'}" alt="Your profile picture" class="current-user-pic" onerror="this.onerror=null;this.src='https://placehold.co/35x35/cccccc/333333?text=You';"/>
                        <textarea class="comment-input" placeholder="Add a comment..." rows="1"></textarea>
                        <button class="comment-submit-button" data-post-id="${post.id}">Post</button>
                    </div>
                </div>
            </div>
        `;
        return postDiv;
    }


    // --- Function to fetch and display comments for a specific post (reused from profile.js) ---
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
                commentsListDiv.innerHTML = `<p class="error-comments">Error loading comments: ${comments.error || 'Unknown error'}</p>`;
            }
        } catch (error) {
            console.error(`Error fetching comments for post ${postId}:`, error);
            commentsListDiv.innerHTML = '<p class="error-comments">Could not load comments.</p>';
        }
    }

    // --- Function to attach event listeners to dynamically created post elements ---
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
            input.addEventListener('input', autoResizeTextarea); // For auto-resizing
            // Initial resize for existing comments if any
            autoResizeTextarea({ target: input });
        });

        // Add event listeners for showing comments on click (if not loaded by default)
        document.querySelectorAll('.comment-count-display').forEach(display => {
            display.removeEventListener('click', handleCommentCountClick);
            display.addEventListener('click', handleCommentCountClick);
        });
    }

    async function handleCommentCountClick(event) {
        const postId = event.currentTarget.closest('.feed-post').dataset.postId;
        const commentsListDiv = document.querySelector(`.comments-list[data-post-id="${postId}"]`);
        if (commentsListDiv) {
            // Toggle visibility or ensure comments are loaded
            if (commentsListDiv.style.display === 'block') {
                commentsListDiv.style.display = 'none';
            } else {
                commentsListDiv.style.display = 'block';
                await fetchAndDisplayCommentsForPost(postId);
            }
        }
    }

    // --- Handle Like/Unlike Button Click (reused from profile.js) ---
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

    // --- Handle Save Button Click (Placeholder) (reused from profile.js) ---
    function handleSaveButtonClick(event) {
        const postId = event.currentTarget.dataset.postId;
        alert(`Save Post ID: ${postId} - This functionality is coming soon!`);
    }

    // --- Handle Share Button Click (Placeholder) (reused from profile.js) ---
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

    // --- Handle Comment Input Keydown (for Enter/Shift+Enter) (reused from profile.js) ---
    async function handleCommentInputKeydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const submitButton = event.target.closest('.comment-input-area').querySelector('.comment-submit-button');
            if (submitButton) {
                submitButton.click();
            }
        }
    }

    // --- Auto-resize Textarea (reused from profile.js) ---
    function autoResizeTextarea(event) {
        const textarea = event.target;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    // --- Handle Comment Submit Button Click (reused from profile.js) ---
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


    // --- Search User Functionality ---
    async function searchUsers() {
        // Hide regular feed posts when searching
        if (postsContainer) {
            postsContainer.style.display = 'none';
        }
        searchResultsContainer.style.display = 'block'; // Show search results container

        const query = userSearchInput.value.trim();
        if (query.length < 2) {
            searchResultsContainer.innerHTML = '<p class="search-message">Please enter at least 2 characters to search.</p>';
            return;
        }

        searchResultsContainer.innerHTML = '<p class="search-message">Searching...</p>';

        try {
            const response = await fetch(`http://localhost:3000/search/users?q=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const users = await response.json();

            if (response.ok) {
                searchResultsContainer.innerHTML = '';

                if (users && users.length > 0) {
                    users.forEach(user => {
                        const userDiv = document.createElement('div');
                        userDiv.className = 'search-result-item';
                        userDiv.innerHTML = `
                            <img src="${user.profile_pic || 'https://placehold.co/50x50/cccccc/333333?text=User'}" alt="${user.username}'s profile picture" onerror="this.onerror=null;this.src='https://placehold.co/50x50/cccccc/333333?text=User';"/>
                            <div class="user-info">
                                <span class="username">@${user.username}</span>
                                <p class="bio">${user.bio || 'No bio yet.'}</p>
                            </div>
                            <button class="view-profile-button" data-user-id="${user.id}">View Profile</button>
                            <button class="follow-button" data-user-id="${user.id}" data-is-following="${user.is_following ? 1 : 0}">${user.is_following ? 'Unfollow' : 'Follow'}</button>
                        `;
                        searchResultsContainer.appendChild(userDiv);
                    });

                    // Attach event listeners to "View Profile" and "Follow" buttons
                    document.querySelectorAll('.view-profile-button').forEach(button => {
                        button.addEventListener('click', (event) => {
                            const userId = event.target.dataset.userId;
                            window.location.href = `/profile.html?userId=${userId}`; // Redirect to a profile page
                        });
                    });

                    document.querySelectorAll('.follow-button').forEach(button => {
                        button.addEventListener('click', handleFollowButtonClick);
                    });

                } else {
                    searchResultsContainer.innerHTML = '<p class="search-message">No users found matching your query.</p>';
                }
            } else {
                searchResultsContainer.innerHTML = `<p class="error-message">Error searching users: ${users.error || 'Unknown error'}</p>`;
                console.error('User search failed:', users);
            }
        } catch (error) {
            console.error('Network or parsing error during user search:', error);
            searchResultsContainer.innerHTML = '<p class="error-message">Could not connect to the server for search.</p>';
        }
    }

    // --- Handle Follow/Unfollow Button Click ---
    async function handleFollowButtonClick(event) {
        if (!authToken) {
            alert('Please log in to follow users.');
            window.location.href = '/login.html';
            return;
        }

        const button = event.currentTarget;
        const targetUserId = button.dataset.userId;
        const isFollowing = button.dataset.isFollowing === '1'; // Convert string to boolean

        const method = isFollowing ? 'DELETE' : 'POST';
        const url = `http://localhost:3000/users/${targetUserId}/follow`;

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
                    button.textContent = 'Unfollow';
                    button.dataset.isFollowing = '1';
                    alert(`Now following @${result.username || 'user'}`);
                } else { // DELETE
                    button.textContent = 'Follow';
                    button.dataset.isFollowing = '0';
                    alert(`Unfollowed @${result.username || 'user'}`);
                }
            } else {
                alert(`Error: ${result.message || result.error || 'Failed to update follow status.'}`);
                console.error('Follow/Unfollow failed:', result);
            }
        } catch (error) {
            console.error('Network error during follow/unfollow:', error);
            alert('Could not connect to the server or failed to process response for follow/unfollow.');
        }
    }


    // Event listeners for search
    if (searchButton) {
        searchButton.addEventListener('click', searchUsers);
    }

    if (userSearchInput) {
        userSearchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                searchUsers();
            }
        });
    }

    // Event listener for clearing search and showing feed
    // This is important if you hide the feed for search results
    if (userSearchInput) {
        userSearchInput.addEventListener('input', () => {
            if (userSearchInput.value.trim() === '') {
                // If search input is cleared, show feed again
                if (postsContainer) {
                    postsContainer.style.display = 'block';
                }
                searchResultsContainer.style.display = 'none';
                searchResultsContainer.innerHTML = ''; // Clear old search results
            }
        });
    }


    // --- Initial Load ---
    // Fetch and display feed posts when the page loads
    fetchAndDisplayFeedPosts();
});