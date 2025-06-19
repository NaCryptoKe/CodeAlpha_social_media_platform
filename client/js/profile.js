// social-media-app/client/js/profile.js

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Profile page DOM loaded. Attempting to fetch user data.');

    const authToken = sessionStorage.getItem('authToken');

    const profilePicImg = document.getElementById('profile-pic-img');
    const profileUsername = document.getElementById('profile-username');
    const profileFullName = document.getElementById('profile-full-name');
    const profileBio = document.getElementById('profile-bio');
    const postCountSpan = document.getElementById('post-count');
    const followersCountSpan = document.getElementById('followers-count');
    const followingCountSpan = document.getElementById('following-count');
    const userPostsContainer = document.getElementById('user-posts-container');

    // --- Authentication Check ---
    if (!authToken) {
        console.warn('No authentication token found. Redirecting to login page');
        alert ('You are not logged in. Please log in to view your profile.');
        window.location.href = '/login.html'; // Ensure this is '/login.html'
        return;
    }

    let currentUserId = null; // Initialize to null

    // --- Fetch User Profile Data ---
    try {
        const response = await fetch('http://localhost:3000/auth/me', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (response.ok){
            console.log('User profile fetched successfully:', data);
            currentUserId = data.userId; // <-- This line sets currentUserId

            // Verify currentUserId is correctly set
            console.log('currentUserId after first fetch:', currentUserId);

            if (profilePicImg) {
                profilePicImg.src = data.profile_pic || 'https://placehold.co/120x120/cccccc/333333?text=Profile';
            }
            if (profileUsername) {
                profileUsername.textContent = `@${data.username}`;
            }
            if (profileFullName) {
                profileFullName.textContent = `${data.first_name || ''} ${data.last_name || ''}`.trim();
            }
            if (profileBio) {
                profileBio.textContent = data.bio || 'No bio.';
            }

            // --- Posts, Follower, Following Counts
            if (postCountSpan) postCountSpan.textContent = data.post_count;
            if (followersCountSpan) followersCountSpan.textContent = data.followers_count;
            if (followingCountSpan) followingCountSpan.textContent = data.following_count;

        } else {
            console.error('Failed to fetch user profile:', data.message || data.error || 'Unknown error');
            alert(`Error loading profile: ${data.message || data.error || 'Unknown error'}`);
            
            if (response.status === 401 || response.status === 403) {
                console.warn('Authentication failed. Token invalid or expired. Logging out.');
                if (typeof window.logoutUser === 'function') {
                    window.logoutUser();
                } else {
                    sessionStorage.clear();
                    window.location.href = '/login.html';
                }
            }
        }
    } catch (error) {
        console.error('Network or parsing error fetching profile:', error);
        alert('Could not connect to the server to load profile data. Please check your internet connection or try again later.');
        if (typeof window.logoutUser === 'function') {
            window.logoutUser();
        } else {
            sessionStorage.clear();
            window.location.href = '/login.html';
        }
    }

    // --- Fetch and Display User's Posts ---
    // This block will only execute if currentUserId is set (from the successful first fetch)
    console.log('Attempting to fetch posts. currentUserId is:', currentUserId); // ADD THIS LOG

    if (currentUserId)
    {
        try {
            const postsResponse = await fetch(`http://localhost:3000/posts/user/${currentUserId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const postsData = await postsResponse.json();

            console.log('Posts API response status:', postsResponse.status); // ADD THIS LOG
            console.log('Raw postsData received:', postsData); // ADD THIS LOG

            if (postsResponse.ok) {
                console.log('User posts fetched successfully. Posts count:', postsData.length); // ADD THIS LOG

                if (userPostsContainer) {
                    userPostsContainer.innerHTML = ''; // Clear "No posts" or any previous message

                    if (postsData && postsData.length > 0) {
                        console.log('Rendering posts...'); // ADD THIS LOG
                        postsData.forEach(post => {
                            const postDiv = document.createElement('div');
                            postDiv.className = 'post';

                            let postContentHTML = '';

                            if (post.image_path) { // Correctly checking for image_path now
                                postContentHTML += `<img src="${post.image_path}" alt="Post image" onerror="this.onerror=null;this.src='https://placehold.co/250x200?text=Image+Error';"/>`;
                            }

                            if (post.content) {
                                postContentHTML += `<p>${post.content}</p>`;
                            }

                            const postDate = new Date(post.created_at).toLocaleString();
                            postContentHTML += `<div class="post-meta">Posted by @${post.username || 'unknown'} on ${postDate}</div>`;

                            postDiv.innerHTML = postContentHTML;
                            userPostsContainer.appendChild(postDiv);
                        });
                        console.log('Finished rendering posts.'); // ADD THIS LOG
                    } else {
                        console.log('No posts found for this user, displaying "No posts yet" message.'); // ADD THIS LOG
                        userPostsContainer.innerHTML = '<p>No posts to display yet.</p>';
                    }
                }
            } else {
                console.error('Failed to fetch user posts:', postsData.message || postsData.error);
                if (userPostsContainer) userPostsContainer.innerHTML = `<p>Error loading posts: ${postsData.message || postsData.error}</p>`;
            }
        } catch (error) {
            console.error('Network or parsing error fetching user posts:', error);
            if (userPostsContainer) userPostsContainer.innerHTML = '<p>Could not load posts due to a network error.</p>';
        }
    } else {
        console.warn('currentUserId was not set. Skipping posts fetch.'); // ADD THIS LOG
    }


    // --- Navigation for Floating Buttons (Settings and Message) ---
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = '/settings.html';
        });
    }

    const msgBtn = document.getElementById('msgBtn');
    if (msgBtn) {
        msgBtn.addEventListener('click', () => {
            alert('Message functionality coming soon!');
        });
    }
});