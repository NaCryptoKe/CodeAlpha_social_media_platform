const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        console.warn('Authentication token missing from request.');
        return res.status(401).json({message: 'Authentication token required.'});
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err.message);

            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Authentication token expired. Please log in again.' });
            }

            return res.status(403).json({ message: 'Invalid or forbidden token.' });
        }

        req.user = user;
        console.log(`Token verified for user ID: ${user.userId}, Username: ${user.username}`);

        next();
    });
    console.log('Authorization header:', req.headers['authorization']);
};

module.exports = authenticateToken;

