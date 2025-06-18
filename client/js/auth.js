// ./client/js/auth.js

const loginForm = document.getElementById(`login-form`);
const registerForm = document.getElementById(`register-form`);

if(loginForm)
{
    loginForm.addEventListener('submit', async(e) => {
        e.preventDefault(); // Prevent default form submission and page reload

        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const rememberMeInput = document.getElementById('remember-me');

        const username = usernameInput.value;
        const password = passwordInput.value;
        const remember_me = rememberMeInput ? rememberMeInput.checked : false;

        try
        {
            const res = await fetch('http://localhost:3000/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, remember_me })
            });

            const data = await res.json();

            if (res.ok)
            {
                sessionStorage.setItem('authToken', data.token);
                sessionStorage.setItem('username', data.username);
                sessionStorage.setItem('userId', data.userId);

                // Clear input for security reasons
                usernameInput.value = '';
                passwordInput.value = '';
                if (rememberMeInput) rememberMeInput.checked = false;

                window.location.href = '../feed.html';
            }
            else
            {
                alert(data.message);
            }
        }catch (err)
        {
            console.error(err);
            alert('Something went wrong during login');
        }
    });
}

// --- Register Form Handler (Example - if you have a register.html with a form) ---

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const firstName = document.getElementById('register-first-name').value;
        const lastName = document.getElementById('register-last-name').value;
        const profilePicture = document.getElementById('register-profile-pic').value; // Or handle file upload

        try {
            const res = await fetch('http://localhost:3000/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    first_name: firstName,
                    last_name: lastName,
                    profile_picture: profilePicture
                })
            });

            const data = await res.json();

            if (res.ok) {
                alert(data.message || 'Registration successful!');
                // Optionally log the user in directly or redirect to login page
                // sessionStorage.setItem('authToken', data.token); // If your register endpoint returns a token
                // window.location.href = '/feed.html';
                window.location.href = '/login.html'; // Redirect to login after successful registration
            } else {
                alert(data.message || data.error || 'Registration failed. Please try again.');
            }
        } catch (err) {
            console.error('Error during registration fetch:', err);
            alert('A network error occurred during registration. Please try again later.');
        }
    });
}


// --- Logout Function (Example - to be called from a button on feed/profile page) ---
function logoutUser() {
    sessionStorage.removeItem('authToken'); // Remove the token
    sessionStorage.removeItem('username'); // Remove other user info
    sessionStorage.removeItem('userId');

    fetch('http://localhost:3000/auth/logout', {method: 'POST' })
        .then(response => response.json())
        .then(data => console.log(data.message))
        .catch(err => console.error('Error communicating logout to server:', err))

    alert('You have been logged out.');
    window.location.href = '/login.html'; // Redirect to login page
}

document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
    }
});