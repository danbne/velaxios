const passport = require("passport");
const MicrosoftStrategy = require("passport-microsoft").Strategy;
const jwt = require("jsonwebtoken");
const db = require("../db");

if (!process.env.JWT_SECRET) {
	throw new Error(
		"JWT_SECRET environment variable is not set. Please define it in your environment."
	);
}

// In-memory token blacklist (for production, use Redis or database)
const tokenBlacklist = new Set();

// Add token to blacklist
const blacklistToken = (token) => {
	tokenBlacklist.add(token);
};

// Check if token is blacklisted
const isTokenBlacklisted = (token) => {
	return tokenBlacklist.has(token);
};

// Create a function to get the callback URL dynamically
const getCallbackURL = (req) => {
	const protocol = req.protocol;
	const host = req.get("host");
	return `${protocol}://${host}/auth/callback`;
};

// Default callback URL for development - should point to server callback endpoint
const defaultCallbackURL = `${
	process.env.SERVER_URL || "http://localhost:5000"
}/auth/callback`;

// Create the Microsoft strategy
passport.use(
	new MicrosoftStrategy(
		{
			clientID: process.env.MICROSOFT_CLIENT_ID,
			clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
			callbackURL: defaultCallbackURL,
			scope: ["user.read"],
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				const { emails, id } = profile;
				const email = emails && emails[0] ? emails[0].value : null;
				if (!email) {
					return done(null, false, {
						message: "No email found in Microsoft profile",
					});
				}

				const { rows } = await db.query(
					"SELECT * FROM users WHERE email = $1",
					[email]
				);

				if (rows.length === 0) {
					return done(null, false, {
						message: "Email not registered in the system",
					});
				}

				let user = rows[0];

				const { rows: updated } = await db.query(
					"UPDATE users SET microsoft_id = $1, last_login = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING *",
					[id, user.user_id]
				);
				user = updated[0];

				const token = jwt.sign(
					{ userId: user.user_id, email: user.email },
					process.env.JWT_SECRET,
					{ expiresIn: "1h" }
				);

				return done(null, { ...user, token });
			} catch (err) {
				return done(err);
			}
		}
	)
);

// Configure Passport for stateless authentication
passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((user, done) => {
	done(null, user);
});

// Verify API key authentication
const verifyApiKey = async (req, res, next) => {
	const apiKey = req.headers["x-api-key"] || req.headers["api-key"];
	if (!apiKey) {
		return res.status(401).json({ error: "No API key provided" });
	}

	try {
		const { rows } = await db.query(
			"SELECT user_id, email FROM users WHERE api_key = $1",
			[apiKey]
		);

		if (rows.length === 0) {
			return res.status(401).json({ error: "Invalid API key" });
		}

		req.user = { userId: rows[0].user_id, email: rows[0].email };
		next();
	} catch (err) {
		res.status(500).json({ error: "Internal server error" });
	}
};

// Verify JWT authentication
const verifyJWT = (req, res, next) => {
	const token = req.headers.authorization?.split(" ")[1];
	if (!token) {
		return res.status(401).json({ error: "No token provided" });
	}

	// Check if token is blacklisted
	if (isTokenBlacklisted(token)) {
		return res.status(401).json({ error: "Token has been revoked" });
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded;
		next();
	} catch (err) {
		res.status(401).json({ error: "Invalid token" });
	}
};

// Combined authentication middleware that accepts both JWT and API key
const authenticate = async (req, res, next) => {
	// Check for API key first
	const apiKey = req.headers["x-api-key"] || req.headers["api-key"];
	if (apiKey) {
		return verifyApiKey(req, res, next);
	}

	// Fall back to JWT authentication
	return verifyJWT(req, res, next);
};

// Function to generate a new token
const generateToken = (userId, email) => {
	return jwt.sign({ userId, email }, process.env.JWT_SECRET, {
		expiresIn: "1h",
	});
};

// Function to refresh token
const refreshToken = (req, res) => {
	try {
		const token = req.headers.authorization?.split(" ")[1];
		if (!token) {
			return res.status(401).json({ error: "No token provided" });
		}

		// Check if token is blacklisted
		if (isTokenBlacklisted(token)) {
			return res.status(401).json({ error: "Token has been revoked" });
		}

		// Verify the current token
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// Generate a new token
		const newToken = generateToken(decoded.userId, decoded.email);

		// Blacklist the old token
		blacklistToken(token);

		// Update last_login in database
		db.query(
			"UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1",
			[decoded.userId]
		);

		res.json({
			token: newToken,
			expiresIn: "1h",
		});
	} catch (err) {
		res.status(401).json({ error: "Invalid token" });
	}
};

// JWT/API key authentication middleware (replaces session-based auth)
const ensureAuthenticated = async (req, res, next) => {
	return authenticate(req, res, next);
};

module.exports = {
	passport,
	verifyJWT,
	verifyApiKey,
	authenticate,
	refreshToken,
	generateToken,
	ensureAuthenticated,
	blacklistToken,
	isTokenBlacklisted,
};
