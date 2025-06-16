const app = require('./app');

const PORT = process.env.PORT;

app.listen(PORT, () => {
	console.log(`Server is listening on port ${PORT}`);
	console.log(`Open your browser at http://localhost:${PORT}`);
});
