// app.js

require('dotenv').config();

//express module import
const express = require(`express`);
const cors = require(`cors`);
const path = require(`path`);

const app = express();

app.use(express.json());
app.use(cors());


// --- Serve Static Frontend Files ---
// This makes all files in './client' available at the root '/'
// e.g., ./login.html -> /login.html
// e.g., ./client/js/auth.js -> /js/auth.js
app.use(express.static(path.join(__dirname, '../client')));

// --- Serve Uploaded Files ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // This path is relative to server.js's directory

// --- API Status Endpoint (Keep it simple) ---
app.get('/api/status', (req, res) => {
	res.json({
		status: `Online`,
		message: `API is up and running`,
		timestamp: new Date().toISOString()
	});
});

// --- Import & Use Routes ---
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts')

// --- Mounting Routes ---
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/posts', postRoutes);

// --- Setting root path to feed for logged in users ---
app.get('/', (req, res) => {
	console.log(`HI`)
	res.sendFile(path.join(__dirname, '../client', 'feed.html'));
});

module.exports = app;
