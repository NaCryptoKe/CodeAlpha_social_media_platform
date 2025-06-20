// server/app.js

require('dotenv').config();
const express = require(`express`);
const cors = require(`cors`);
const path = require(`path`);

const app = express();

app.use(express.json());
app.use(cors());

// Serve static frontend files first
app.use(express.static(path.join(__dirname, '../client')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/status', (req, res) => {
    res.json({
        status: `Online`,
        message: `API is up and running`,
        timestamp: new Date().toISOString()
    });
});

// Import your route modules
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comment');
const likeRoutes = require('./routes/likes'); // <<< ADD THIS LINE to import the likes router

// --- TEMPORARY DIAGNOSTIC ROUTE ---
// Place this BEFORE your app.use('/posts', ...) lines
app.post('/posts/:postId/comment', (req, res, next) => {
    console.log('--- Diagnostic Log ---');
    console.log(`Method: ${req.method}`);
    console.log(`Path: ${req.path}`);
    console.log(`Original URL: ${req.originalUrl}`);
    console.log('Req body:', req.body);
    console.log('--- End Diagnostic Log ---');
    next();
});
// --- END TEMPORARY DIAGNOSTIC ROUTE ---


// Mount your main API routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/posts', postRoutes);
app.use('/posts', commentRoutes);
app.use('/posts', likeRoutes); // <<< ADD THIS LINE to mount the likes router under /posts

// Set the root path for logged-in users
app.get('/', (req, res) => {
    console.log(`HI`);
    res.sendFile(path.join(__dirname, '../client/feed.html'));
});

// Catch-all for undefined routes
app.use((req, res, next) => {
    res.status(404).send('404 Not Found - Custom Catch-all from app.js');
});

module.exports = app;