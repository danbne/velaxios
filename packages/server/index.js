require("dotenv").config({
	path: require("path").resolve(__dirname, "../../.env"),
});

// fetch is available globally in Node.js 18+

// Debug: Log environment variables (remove sensitive data in production)
console.log("Server: Environment variables loaded:");
console.log(
	"Server: MICROSOFT_CLIENT_ID:",
	process.env.MICROSOFT_CLIENT_ID ? "Set" : "Not set"
);
console.log(
	"Server: MICROSOFT_CLIENT_SECRET:",
	process.env.MICROSOFT_CLIENT_SECRET ? "Set" : "Not set"
);
console.log("Server: JWT_SECRET:", process.env.JWT_SECRET ? "Set" : "Not set");
console.log("Server: CLIENT_URL:", process.env.CLIENT_URL || "Not set");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const passport = require("./security/auth").passport;
// Import security middleware functions with fallbacks
let securityHeaders,
	generalRateLimiter,
	authRateLimiter,
	apiRateLimiter,
	csrfProtection,
	sanitizeInput,
	validateInput;

try {
	const middleware = require("./security/middleware");
	securityHeaders = middleware.securityHeaders;
	generalRateLimiter = middleware.generalRateLimiter;
	authRateLimiter = middleware.authRateLimiter;
	apiRateLimiter = middleware.apiRateLimiter;
	csrfProtection = middleware.csrfProtection;
	sanitizeInput = middleware.sanitizeInput;
	validateInput = middleware.validateInput;
} catch (error) {
	// Fallback implementations if middleware is not available
	securityHeaders = (req, res, next) => next();
	generalRateLimiter = (req, res, next) => next();
	authRateLimiter = (req, res, next) => next();
	apiRateLimiter = (req, res, next) => next();
	csrfProtection = (req, res, next) => next();
	sanitizeInput = (req, res, next) => next();
	validateInput = (req, res, next) => next();
}

const db = require("./db");
const projectRoutes = require("./routes/project");
const gridStateRoutes = require("./routes/gridState");
const gridLayoutsRoutes = require("./routes/gridLayouts");
const usersRoutes = require("./routes/users");
const assetRoutes = require("./routes/asset");
const assetLevelRoutes = require("./routes/assetLevel");
const assetPhotoRoutes = require("./routes/assetPhoto");
const assetComponentRoutes = require("./routes/assetComponent");
const securityRoutes = require("./routes/security");
const {
	authenticate,
	refreshToken,
	ensureAuthenticated,
	blacklistToken,
} = require("./security/auth");

const app = express();
const port = process.env.PORT || 5000;

// Security middleware
app.use(securityHeaders);
app.use(sanitizeInput);

// CORS configuration
app.use(
	cors({
		origin: process.env.CLIENT_URL || "http://localhost:3000",
		credentials: false, // No cookies needed for JWT/API key auth
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"x-api-key",
			"api-key",
			"x-csrf-token",
			"x-session-token",
		],
	})
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Passport initialization
app.use(passport.initialize());

// General rate limiting
app.use(generalRateLimiter);

// Test database connection
db.pool.connect((err, client, release) => {
	if (err) {
		console.error("Database connection error:", err);
		return;
	}
	release();
	console.log("Database connection successful");
});

// Authentication routes with rate limiting
app.get(
	"/auth/microsoft",
	authRateLimiter,
	passport.authenticate("microsoft", {
		scope: ["user.read"],
		session: false,
	})
);
app.get("/auth/callback", async (req, res) => {
	console.log("Server: /auth/callback endpoint hit");
	const code = req.query.code;
	console.log("Server: Authorization code received:", code ? "Yes" : "No");

	if (!code) {
		return res.status(400).json({ error: "No authorization code provided" });
	}

	try {
		console.log("Server: Exchanging authorization code for token");

		// Exchange the authorization code for an access token
		const redirectUri = "http://localhost:5000/auth/callback";
		console.log("Server: Using redirect URI:", redirectUri);
		console.log("Server: Client ID:", process.env.MICROSOFT_CLIENT_ID);
		console.log(
			"Server: Client Secret length:",
			process.env.MICROSOFT_CLIENT_SECRET
				? process.env.MICROSOFT_CLIENT_SECRET.length
				: 0
		);

		const tokenResponse = await fetch(
			"https://login.microsoftonline.com/common/oauth2/v2.0/token",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					client_id: process.env.MICROSOFT_CLIENT_ID,
					client_secret: process.env.MICROSOFT_CLIENT_SECRET,
					code: code,
					grant_type: "authorization_code",
					redirect_uri: redirectUri,
				}),
			}
		);

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();
			console.error("Server: Token exchange failed:", errorText);
			return res
				.status(500)
				.json({ error: "Failed to exchange code for token" });
		}

		const tokenData = await tokenResponse.json();
		console.log("Server: Token exchange successful");

		// Get user info from Microsoft Graph
		const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
			headers: {
				Authorization: `Bearer ${tokenData.access_token}`,
			},
		});

		if (!userResponse.ok) {
			console.error("Server: Failed to get user info");
			return res.status(500).json({ error: "Failed to get user info" });
		}

		const userData = await userResponse.json();
		console.log("Server: User info retrieved:", userData.mail);

		// Check if user exists in database
		const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [
			userData.mail,
		]);

		if (rows.length === 0) {
			console.error("Server: User not found in database:", userData.mail);
			return res.status(401).json({
				error: "User not registered in the system",
				email: userData.mail,
			});
		}

		const user = rows[0];
		console.log("Server: User found in database:", user.email);

		// Update user's Microsoft ID and last login
		await db.query(
			"UPDATE users SET microsoft_id = $1, last_login = CURRENT_TIMESTAMP WHERE user_id = $2",
			[userData.id, user.user_id]
		);

		// Generate JWT token for the user
		const jwt = require("jsonwebtoken");
		const userToken = jwt.sign(
			{ userId: user.user_id, email: user.email },
			process.env.JWT_SECRET,
			{ expiresIn: "1h" }
		);

		// Redirect to frontend with token
		const frontendUrl = process.env.CLIENT_URL || "http://localhost:3000";
		res.redirect(
			`${frontendUrl}/auth/callback?token=${userToken}&success=true`
		);
	} catch (error) {
		console.error("Server: Error in callback:", error);
		res.status(500).json({
			error: "Internal server error",
			details: error.message,
		});
	}
});

// Protected routes with security middleware
app.use(
	"/api/project",
	apiRateLimiter,
	csrfProtection,
	ensureAuthenticated,
	projectRoutes
);
app.use(
	"/api/grid-state",
	apiRateLimiter,
	csrfProtection,
	authenticate,
	gridStateRoutes
);
app.use(
	"/api/grid-layouts",
	apiRateLimiter,
	csrfProtection,
	authenticate,
	gridLayoutsRoutes
);
app.use(
	"/api/users",
	apiRateLimiter,
	csrfProtection,
	authenticate,
	usersRoutes
);
app.use(
	"/api/asset",
	apiRateLimiter,
	csrfProtection,
	authenticate,
	assetRoutes
);
app.use(
	"/api/asset-level",
	apiRateLimiter,
	csrfProtection,
	authenticate,
	assetLevelRoutes
);
app.use(
	"/api/asset-photo",
	apiRateLimiter,
	csrfProtection,
	authenticate,
	assetPhotoRoutes
);
app.use(
	"/api/asset-component",
	apiRateLimiter,
	csrfProtection,
	authenticate,
	assetComponentRoutes
);

// Security monitoring routes (admin only)
app.use(
	"/api/security",
	apiRateLimiter,
	csrfProtection,
	authenticate,
	securityRoutes
);

// Token refresh route
app.post("/api/auth/refresh", refreshToken);
app.post("/api/auth/logout", authenticate, (req, res) => {
	try {
		const token = req.headers.authorization?.split(" ")[1];
		if (token) {
			// Blacklist the token
			blacklistToken(token);
		}
		res.json({ message: "Logout successful - token has been revoked" });
	} catch (error) {
		res.status(500).json({ error: "Logout failed" });
	}
});

// Basic route
app.get("/", (req, res) => {
	res.json({ message: "Welcome to Velaxios API" });
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error("Express error handler:", err);

	// Handle database errors
	if (err.code) {
		// PostgreSQL error codes
		switch (err.code) {
			case "23505": // Unique constraint violation
				return res.status(409).json({
					error: "Duplicate entry",
					details: err.detail || err.message,
					code: err.code,
				});
			case "23503": // Foreign key constraint violation
				return res.status(400).json({
					error: "Referenced record not found",
					details: err.detail || err.message,
					code: err.code,
				});
			case "23514": // Check constraint violation
				return res.status(400).json({
					error: "Data validation failed",
					details: err.detail || err.message,
					code: err.code,
				});
			default:
				return res.status(500).json({
					error: "Database error",
					details: err.detail || err.message,
					code: err.code,
				});
		}
	}

	// Handle other types of errors
	res.status(500).json({
		error: "Internal server error",
		details: err.message || "An unexpected error occurred",
	});
});

process.on("uncaughtException", (err) => {
	console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled Rejection:", reason);
});

// Start server
app.listen(port, () => {
	console.log(`Server started on port ${port}`);
});
