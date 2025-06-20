// client/js/createPost.js

document.addEventListener('DOMContentLoaded', () => {
    const createPostForm = document.getElementById('createPostForm');
    const postContentInput = document.getElementById('postContent');
    const postImageInput = document.getElementById('postImage');
    const postMessageElement = document.getElementById('postMessage');
    const backToFeedNavLink = document.getElementById('backToFeedNavLink');
    const postImagePreview = document.getElementById('postImagePreview');

    // Handle navigation back to feed
    if (backToFeedNavLink) {
        backToFeedNavLink.addEventListener('click', () => {
            window.location.href = '/feed.html';
        });
    }

    if (createPostForm) {
        createPostForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission

            postMessageElement.textContent = ''; // Clear previous messages
            postMessageElement.className = 'message'; // Reset message styling

            const content = postContentInput.value.trim();
            const imageFile = postImageInput.files[0]; // Get the selected file

            // Check if there's content or an image
            if (!content && !imageFile) {
                postMessageElement.textContent = 'Please enter some text or select an image to post.';
                postMessageElement.classList.add('error-message');
                return;
            }

            const authToken = sessionStorage.getItem('authToken');
            if (!authToken) {
                postMessageElement.textContent = 'You are not logged in. Please log in to post.';
                postMessageElement.classList.add('error-message');
                // Redirect to login after a short delay
                setTimeout(() => { window.location.href = '/login.html'; }, 1500);
                return;
            }

            // Use FormData for sending files and text together
            const formData = new FormData();
            if (content) {
                formData.append('content', content);
            }
            if (imageFile) {
                formData.append('image', imageFile); // 'image' must match the field name used in upload.single('image') in routes/posts.js
            }

            try {
                const response = await fetch('http://localhost:3000/posts', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}` // No 'Content-Type' header needed for FormData
                    },
                    body: formData // Send the FormData object directly
                });

                const result = await response.json();

                if (response.ok) {
                    postMessageElement.textContent = result.message || 'Post created successfully!';
                    postMessageElement.classList.add('success-message');
                    // Optionally clear the form or redirect
                    postContentInput.value = ''; // Clear text area
                    postImageInput.value = ''; // Clear file input
                    // Consider redirecting to feed after a successful post
                    setTimeout(() => {
                        window.location.href = '/feed.html';
                    }, 1500);
                } else {
                    postMessageElement.textContent = result.error || 'Failed to create post.';
                    postMessageElement.classList.add('error-message');
                }
            } catch (error) {
                console.error('Network or server error during post creation:', error);
                postMessageElement.textContent = 'Could not connect to the server. Please try again later.';
                postMessageElement.classList.add('error-message');
            }
        });
    }

    // --- Image Preview Logic ---
    if (postImageInput) {
        postImageInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    postImagePreview.src = e.target.result;
                };
                reader.readAsDataURL(file); // Read the image file as a Data URL
            } else {
                // If no file is selected, revert to placeholder or current user pic
                // This will be handled by fetchAndPreFillProfileForm on load/update
                postImagePreview.src = 'https://placehold.co/150x150/cccccc/333333?text=Preview';
            }
        });
    }
});