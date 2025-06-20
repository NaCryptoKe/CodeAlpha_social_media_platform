// server/server.js

const app = require('./app'); // Import the Express app configured in app.js
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => { // '0.0.0.0' makes it listen on all network interfaces
    console.log(`Server running on port ${PORT}`);
});