// server/models/db.js
const { Pool } = require('pg');

const pool = new Pool ({
	connectionString: process.env.DATABASE_URL,
});

pool.connect()
	.then (() => console.log('Connected to PostgreSQL database'))
	.catch(err => console.error('Error connecting to PostgreSQL:', err.stack));

module.exports = pool;
