const { Pool } = require("pg");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Verify database configuration
if (!process.env.DATABASE_URL) {
	process.exit(1);
}

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

// Test the connection
pool.on("error", (err) => {
	process.exit(-1);
});

module.exports = {
	pool,
	query: (...args) => pool.query(...args),
};
