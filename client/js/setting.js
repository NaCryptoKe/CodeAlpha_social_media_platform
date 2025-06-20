// client/js/setting.js

document.addEventListener('DOMContentLoaded', async () => {
    const usernameInput = document.getElementById('usernameInput');
    const bioInput = document.getElementById('bioInput');
    const profilePicInput = document.getElementById('profilePicInput');
    const profilePicPreview = document.getElementById('profilePicPreview'); // New: for image preview
    const profileUpdateForm = document.getElementById('profileUpdateForm');
    const profileMessageElement = document.getElementById('profileMessage');

    // Navigation buttons
    const profileNavLink = document.getElementById('profileNavLink');
    const feedNavLink = document.getElementById('feedNavLink');
    const logoutButton = document.getElementById('logoutButton');
    const logoutMessageElement = document.getElementById('logoutMessage');

    const authToken = sessionStorage.getItem('authToken');
    let currentUserId = null;

    // --- Navigation Handlers ---
    if (profileNavLink) {
        profileNavLink.addEventListener('click', () => {
            window.location.href = '/profile.html';
        });
    }

    if (feedNavLink) {
        feedNavLink.addEventListener('click', () => {
            window.location.href = '/feed.html';
        });
    }

    // --- Logout Handler ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            if (typeof window.logoutUser === 'function') {
                window.logoutUser();
            } else {
                sessionStorage.clear();
                logoutMessageElement.textContent = 'Logged out successfully.';
                logoutMessageElement.classList.add('success-message');
                setTimeout(() => { window.location.href = '/login.html'; }, 1000);
            }
        });
    }

    // --- Image Preview Logic ---
    if (profilePicInput) {
        profilePicInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    profilePicPreview.src = e.target.result;
                };
                reader.readAsDataURL(file); // Read the image file as a Data URL
            } else {
                // If no file is selected, revert to placeholder or current user pic
                // This will be handled by fetchAndPreFillProfileForm on load/update
                profilePicPreview.src = 'https://placehold.co/150x150/cccccc/333333?text=Preview';
            }
        });
    }

    // --- Function to fetch and pre-fill user profile data for the form ---
    async function fetchAndPreFillProfileForm() {
        if (!authToken) {
            console.warn('No authentication token found. Redirecting to login page.');
            profileMessageElement.textContent = 'You are not logged in. Redirecting...';
            profileMessageElement.classList.add('error-message');
            setTimeout(() => { window.location.href = '/login.html'; }, 1500);
            return;
        }

        try {
            const tokenParts = authToken.split('.');
            if (tokenParts.length !== 3) {
                throw new Error('Invalid token format');
            }
            const payload = JSON.parse(atob(tokenParts[1]));
            currentUserId = payload.userId;

            if (!currentUserId) {
                profileMessageElement.textContent = 'Could not determine user ID from token. Please re-login.';
                profileMessageElement.classList.add('error-message');
                return;
            }

            const response = await fetch(`http://localhost:3000/users/${currentUserId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const user = await response.json();

            if (response.ok) {
                usernameInput.value = user.username || '';
                bioInput.value = user.bio || '';
                // Set initial preview to current profile picture
                profilePicPreview.src = user.profile_pic || 'https://placehold.co/150x150/cccccc/333333?text=Preview';
                profilePicPreview.onerror = function() { // Fallback if image fails to load
                    this.onerror=null;
                    this.src='https://placehold.co/150x150/cccccc/333333?text=Preview';
                };
            } else {
                profileMessageElement.textContent = user.error || 'Failed to load profile for editing.';
                profileMessageElement.classList.add('error-message');
            }
        } catch (error) {
            console.error('Error fetching profile for form pre-fill:', error);
            profileMessageElement.textContent = 'Network error. Could not load profile data.';
            profileMessageElement.classList.add('error-message');
            if (error.message === 'Invalid token format' || error.message.includes('Unexpected token')) {
                 setTimeout(() => { window.location.href = '/login.html'; }, 1500);
            }
        }
    }

    // --- Handle Profile Update Form Submission ---
    if (profileUpdateForm) {
        profileUpdateForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            profileMessageElement.textContent = '';
            profileMessageElement.className = 'message';

            const newUsername = usernameInput.value.trim();
            const newBio = bioInput.value.trim();
            const newProfilePicFile = profilePicInput.files[0];

            if (!newUsername && !newBio && !newProfilePicFile) {
                profileMessageElement.textContent = 'Please enter new details or select a new profile picture to update.';
                profileMessageElement.classList.add('error-message');
                return;
            }

            if (!authToken) {
                profileMessageElement.textContent = 'Authentication required. Redirecting to login.';
                profileMessageElement.classList.add('error-message');
                setTimeout(() => { window.location.href = '/login.html'; }, 1500);
                return;
            }

            const formData = new FormData();
            if (newUsername) {
                formData.append('username', newUsername);
            }
            if (newBio) {
                formData.append('bio', newBio);
            }
            if (newProfilePicFile) {
                formData.append('profilePic', newProfilePicFile);
            }

            try {
                const response = await fetch(`http://localhost:3000/users/profile`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    profileMessageElement.textContent = result.message || 'Profile updated successfully!';
                    profileMessageElement.classList.add('success-message');
                    profilePicInput.value = ''; // Clear file input
                    // Re-fetch to show new current profile picture on preview
                    fetchAndPreFillProfileForm();
                } else {
                    profileMessageElement.textContent = result.error || 'Failed to update profile.';
                    profileMessageElement.classList.add('error-message');
                }
            } catch (error) {
                console.error('Network or server error during profile update:', error);
                profileMessageElement.textContent = 'Could not connect to the server to update profile.';
                profileMessageElement.classList.add('error-message');
            }
        });
    }

    // --- Initial Load for Settings Page ---
    fetchAndPreFillProfileForm();
});