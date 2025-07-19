const express = require("express");
const router = express.Router();
const db = require("../db");
const { z } = require("zod");
const crypto = require("crypto");
// Import security middleware functions
let hashApiKey, verifyApiKey;

try {
	const middleware = require("../security/middleware");
	hashApiKey = middleware.hashApiKey;
	verifyApiKey = middleware.verifyApiKey;
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
}

const { body, validationResult } = require("express-validator");

// Get all users (with PII protection)
router.get("/", async (req, res, next) => {
	try {
		const { rows } = await db.query(
			`
			SELECT 
				user_id, 
				CASE 
					WHEN $1 = true THEN email 
					ELSE CONCAT(LEFT(email, 2), '***', RIGHT(email, LENGTH(email) - POSITION('@' IN email) + 1)) 
				END as email,
				microsoft_id, 
				last_login, 
				created_at,
				CASE WHEN api_key_hash IS NOT NULL THEN true ELSE false END as has_api_key
			FROM users 
			ORDER BY created_at DESC
		`,
			[req.user?.userId === req.query.showFullEmail]
		);
		res.json({ users: rows });
	} catch (error) {
		next(error);
	}
});

// Get user by ID (with PII protection)
router.get("/:id", async (req, res, next) => {
	try {
		const { id } = req.params;
		const { rows } = await db.query(
			`
			SELECT 
				user_id, 
				CASE 
					WHEN $2 = true THEN email 
					ELSE CONCAT(LEFT(email, 2), '***', RIGHT(email, LENGTH(email) - POSITION('@' IN email) + 1)) 
				END as email,
				microsoft_id, 
				last_login, 
				created_at,
				CASE WHEN api_key_hash IS NOT NULL THEN true ELSE false END as has_api_key
			FROM users 
			WHERE user_id = $1
		`,
			[id, req.user?.userId === id]
		);

		if (rows.length === 0) {
			return res.status(404).json({ error: "User not found" });
		}
		res.json(rows[0]);
	} catch (error) {
		next(error);
	}
});

// Update user
router.put("/:id", async (req, res) => {
	const userUpdateSchema = z.object({
		email: z.string().email(),
		microsoft_id: z.string().optional().nullable(),
	});
	const parseResult = userUpdateSchema.safeParse(req.body);
	if (!parseResult.success) {
		return sendError(
			res,
			400,
			"Invalid user update data",
			parseResult.error.errors
		);
	}
	const { id } = req.params;
	const { email, microsoft_id } = req.body;
	const { rows } = await db.query(
		"UPDATE users SET email = $1, microsoft_id = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3 RETURNING user_id, email, microsoft_id, last_login, created_at",
		[email, microsoft_id, id]
	);
	if (rows.length === 0) {
		return sendError(res, 404, "User not found");
	}
	res.json(rows[0]);
});

// Delete user
router.delete("/:id", async (req, res) => {
	const { id } = req.params;
	const { rows } = await db.query(
		"DELETE FROM users WHERE user_id = $1 RETURNING user_id",
		[id]
	);
	if (rows.length === 0) {
		return sendError(res, 404, "User not found");
	}
	res.json({ message: "User deleted successfully" });
});

// Generate API key for a user (with hashing)
router.post("/:id/api-key", async (req, res) => {
	try {
		const { id } = req.params;

		// Generate a secure API key
		const apiKey = crypto.randomBytes(32).toString("hex");

		// Hash the API key before storing
		const hashedApiKey = await hashApiKey(apiKey);

		const { rows } = await db.query(
			"UPDATE users SET api_key_hash = $1 WHERE user_id = $2 RETURNING user_id, email",
			[hashedApiKey, id]
		);

		if (rows.length === 0) {
			return res.status(404).json({ error: "User not found" });
		}

		res.json({
			message: "API key generated successfully",
			apiKey: apiKey, // Return the plain key only once
		});
	} catch (error) {
		next(error);
	}
});

// Revoke API key for a user
router.delete("/:id/api-key", async (req, res) => {
	try {
		const { id } = req.params;

		const { rows } = await db.query(
			"UPDATE users SET api_key_hash = NULL WHERE user_id = $1 RETURNING user_id",
			[id]
		);

		if (rows.length === 0) {
			return res.status(404).json({ error: "User not found" });
		}

		res.json({ message: "API key revoked successfully" });
	} catch (error) {
		next(error);
	}
});

// Get API key for a user (only show if it exists, not the actual key)
router.get("/:id/api-key", async (req, res) => {
	try {
		const { id } = req.params;

		const { rows } = await db.query(
			"SELECT user_id, email, CASE WHEN api_key_hash IS NOT NULL THEN true ELSE false END as has_api_key FROM users WHERE user_id = $1",
			[id]
		);

		if (rows.length === 0) {
			return res.status(404).json({ error: "User not found" });
		}

		res.json({
			hasApiKey: rows[0].has_api_key,
		});
	} catch (error) {
		next(error);
	}
});

module.exports = router;
