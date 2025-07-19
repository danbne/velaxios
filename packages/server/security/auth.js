const passport = require("passport");
const MicrosoftStrategy = require("passport-microsoft").Strategy;
const jwt = require("jsonwebtoken");
const db = require("../db");

// Import security middleware functions
let hashApiKey, verifyApiKey, generateJWTSecret;

try {
	const middleware = require("./middleware");
	hashApiKey = middleware.hashApiKey;
	verifyApiKey = middleware.verifyApiKey;
	generateJWTSecret = middleware.generateJWTSecret;
} catch (error) {
	// Fallback implementations if middleware is not available
	hashApiKey = async (apiKey) => {
		const crypto = require("crypto");
		return crypto.createHash("sha256").update(apiKey).digest("hex");
	};

	verifyApiKey = async (plainApiKey, hashedApiKey) => {
		const crypto = require("crypto");
		const hash = crypto.createHash("sha256").update(plainApiKey).digest("hex");
		return hash === hashedApiKey;
	};

	generateJWTSecret = () => {
		const crypto = require("crypto");
		return crypto.randomBytes(64).toString("hex");
	};
}

// JWT secret management with rotation support
let currentJWTSecret = process.env.JWT_SECRET;
let previousJWTSecret = process.env.JWT_SECRET_PREVIOUS;

if (!currentJWTSecret) {
	throw new Error(
		"JWT_SECRET environment variable is not set. Please define it in your environment."
	);
}

// JWT secret rotation function
const rotateJWTSecret = () => {
	previousJWTSecret = currentJWTSecret;
	currentJWTSecret = generateJWTSecret();
	console.log("🔐 JWT secret rotated successfully");
	return currentJWTSecret;
};

// Schedule JWT secret rotation (optional, only in production)
if (
	process.env.ENABLE_JWT_ROTATION === "true" ||
	process.env.NODE_ENV === "production"
) {
	// Use a smaller interval to avoid 32-bit integer overflow
	// Check every hour and rotate if 30 days have passed
	const checkInterval = 60 * 60 * 1000; // 1 hour
	const rotationPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
	let lastRotation = Date.now();

	setInterval(() => {
		const now = Date.now();
		if (now - lastRotation >= rotationPeriod) {
			if (process.env.NODE_ENV === "production") {
				rotateJWTSecret();
			} else {
				// In development, just rotate silently
				previousJWTSecret = currentJWTSecret;
				currentJWTSecret = generateJWTSecret();
			}
			lastRotation = now;
		}
	}, checkInterval);

	console.log(
		`🔐 JWT secret rotation enabled (checking every hour, rotating every 30 days)`
	);
} else {
	console.log(
		"🔐 JWT secret rotation disabled (set ENABLE_JWT_ROTATION=true to enable)"
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
					currentJWTSecret,
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

// Verify API key authentication with hashed keys
const verifyApiKeyAuth = async (req, res, next) => {
	const apiKey = req.headers["x-api-key"] || req.headers["api-key"];
	if (!apiKey) {
		return res.status(401).json({ error: "No API key provided" });
	}

	try {
		const { rows } = await db.query(
			"SELECT user_id, email, api_key_hash FROM users WHERE api_key_hash IS NOT NULL",
			[]
		);

		// Check against all hashed API keys
		for (const row of rows) {
			const isValid = await verifyApiKey(apiKey, row.api_key_hash);
			if (isValid) {
				req.user = { userId: row.user_id, email: row.email };
				return next();
			}
		}

		return res.status(401).json({ error: "Invalid API key" });
	} catch (err) {
		console.error("API key verification error:", err);
		res.status(500).json({ error: "Internal server error" });
	}
};

// Verify JWT authentication with secret rotation support
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
		// Try current secret first
		const decoded = jwt.verify(token, currentJWTSecret);
		req.user = decoded;
		next();
	} catch (err) {
		// If current secret fails, try previous secret (for graceful rotation)
		if (previousJWTSecret && previousJWTSecret !== currentJWTSecret) {
			try {
				const decoded = jwt.verify(token, previousJWTSecret);
				req.user = decoded;
				next();
			} catch (prevErr) {
				res.status(401).json({ error: "Invalid token" });
			}
		} else {
			res.status(401).json({ error: "Invalid token" });
		}
	}
};

// Combined authentication middleware that accepts both JWT and API key
const authenticate = async (req, res, next) => {
	// Check for API key first
	const apiKey = req.headers["x-api-key"] || req.headers["api-key"];
	if (apiKey) {
		return verifyApiKeyAuth(req, res, next);
	}

	// Fall back to JWT authentication
	return verifyJWT(req, res, next);
};

// Function to generate a new token
const generateToken = (userId, email) => {
	return jwt.sign({ userId, email }, currentJWTSecret, {
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
		const decoded = jwt.verify(token, currentJWTSecret);

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
	verifyApiKey: verifyApiKeyAuth,
	authenticate,
	refreshToken,
	generateToken,
	ensureAuthenticated,
	blacklistToken,
	isTokenBlacklisted,
};
