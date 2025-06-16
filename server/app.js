//Loading .env file by config()
require('dotenv').config();

//express module import
const express = require(`express`);
const cors = require(`cors`);
const authenticateToken = require('./middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const bcrypt = require(`bcryptjs`);
const app = express();
const databaseUrl = process.env.DATABASE_URL;
const appPort = process.env.PORT;
const pool = require(`./models/db`);
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
	res.send(`Hello from Express App! On port ${appPort}. Using ${databaseUrl}`);
});

app.get('/api/status', (req, res) => {
	res.json({
		status: `Online`,
		message: `API is up and running`,
		timestamp: new Date().toISOString()
	});
});

// Register
app.post('/auth/register', async (req, res) => {
	const { username, email, password, first_name, last_name, profile_picture} = req.body;

	console.log('Register attempt:', { username, email, password: password ? '[PASSWORD PROVIDED]' : '[PASSWORD MISSING]', first_name, last_name, profile_picture});

	if (!username || !email || !password || !first_name) {
        return res.status(400).json({ error: 'Username, email, and password, first_name are required.' });
    }

	try {
		// check for existing user
		const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
		if (existingUser.rows.length > 0) {
			return res.status(409).json({ error: 'Username or email already in use.' });
		}

		const passwordHash = await bcrypt.hash(password, 10);
		
		const newUserResult = await pool.query(
            'INSERT INTO users (username, email, password_hash, first_name, last_name, profile_pic) VALUES ($1, $2, $3, $4, $5, $6) RETURNING * ',
            [username, email, passwordHash, first_name, last_name, profile_picture]
        );

		const newUser = newUserResult.rows[0];

		console.log('New user registered:', newUser.username, newUser.id);

		res.status(201).json({
            message: 'User registered successfully',
            userId: newUser.id,
            username: newUser.username,
            email: newUser.email,
			first_name: newUser.first_name,
			last_name: newUser.last_name,
			profile_picture: newUser.profile_pic,
            created_at: newUser.created_at
        });
	} catch (err) {
        console.error('Error during user registration:', err.message);
        res.status(500).json({ error: 'Internal server error during registration.' });
    }
});

// Login
app.post('/auth/login', async (req, res) => {
	const { username, password, remember_me } = req.body;

	console.log('Login attempt for:', username, 'Remember me:', remember_me);

	if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

	try {
		const userResult = await pool.query(
            'SELECT id, username, email, password_hash, first_name, last_name, profile_pic FROM users WHERE username = $1 OR email = $1', // Allow login by username or email
            [username]
        );

		const user = userResult.rows[0];

		if (!user) {
            console.log(`Login failed: User '${username}' not found.`);
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

		const passwordMatch = await bcrypt.compare(password, user.password_hash);

		if (!passwordMatch) {
            console.log(`Login failed: Incorrect password for user '${username}'.`);
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

		const payload = {
            userId: user.id,
            username: user.username,
            email: user.email,
			bio: user.bio,
			profile_pic: user.profile_pic,
			first_name: user.first_name,
			last_name: user.last_name,
        };

		let expiresIn;

		if (remember_me) {
			expiresIn = '30d';
		} else {
			expiresIn = '1h';
		}

		const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: expiresIn });

		console.log(`User '${username}' logged in successfully. Token generated.`);

		res.status(200).json({
            message: 'Login successful',
            token: token,
            userId: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            profile_picture: user.profile_pic
        });
	} catch (err) {
		console.error('Error during user login:', err.message);
        res.status(500).json({ error: 'Internal server error during login.' });
	}
});

// Personal Info
app.get('/auth/me', authenticateToken, async (req, res) => {
	try {
		const userId = req.user.userId;

		console.log('Fetching profile for userId:', userId);

		const userResult = await pool.query(
			'SELECT id, username, email, bio, profile_pic, first_name, last_name, created_at FROM users WHERE id = $1', 
			[userId]
		);

		const user = userResult.rows[0];
		console.log('User found:', user);

		if (!user) {
			console.warn(`User ID ${userId} from token not found in database. Token might be stale.`);
			return res.status(404).json({ message: 'User profile not found.' });
		}

		console.log(`Successfully retrieved profile for user: ${user.username} (ID: ${user.id})`);

		res.status(200).json({
			message: 'User profile retrieved successfully',
			userId: user.id,
			username: user.username,
			email: user.email,
			bio: user.bio,
			profile_pic: user.profile_pic,
			first_name: user.first_name,
			last_name: user.last_name,
			created_at: user.created_at,
		});
	} catch (err) {
		console.error('Error fetching user profile:', err.message);
		res.status(500).json({ error: 'Internal server error fetching profile.' });
	}
});

app.post('/auth/logout', (req, res) => {
    // No server-side action, just instruct frontend to delete the token
    res.status(200).json({ message: 'Logged out successfully. Please remove token on client.' });
});

app.get('/profile', async (req, res) => {
	const nameFilter = req.query.username;

	console.log('--- REQUEST RECEIVED FOR /username ---');
	console.log('Received nameFilter:', nameFilter);

	let queryText = 'SELECT * FROM users';
	let queryParams = [];

	if (nameFilter) {
		queryText += ' WHERE username ILIKE $1';
		queryParams.push(`%${nameFilter}%`);
	}

	queryText += ' ORDER BY id ASC';

	console.log('Constructed queryText:', queryText);
	console.log('Constructed queryParams:', queryParams);

	try {
		const result = await pool.query(queryText, queryParams);
		res.json(result.rows);
	} catch (err) {
		console.error('Error fetching items:', err.message);
		res.status(500).json({error: 'Internal server error' });
	}
});

module.exports = app;
