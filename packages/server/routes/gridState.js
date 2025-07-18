const express = require("express");
const router = express.Router();
const db = require("../db");

// Get grid state for a user and grid
router.get("/:gridId", async (req, res) => {
	try {
		const { gridId } = req.params;
		const userId = req.user.userId; // From JWT
		const { rows } = await db.query(
			"SELECT state FROM grid_state WHERE user_id = $1 AND grid_id = $2 AND state_type = 'normal'",
			[userId, gridId]
		);
		const result = rows.length > 0 ? rows[0].state : null;
		res.json(result);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Save or update grid state
router.post("/:gridId", async (req, res) => {
	try {
		const { gridId } = req.params;
		const state = req.body; // The full state object from AG Grid
		const userId = req.user.userId; // From JWT

		const { rows } = await db.query(
			`INSERT INTO grid_state (user_id, grid_id, state, state_type)
       VALUES ($1, $2, $3, 'normal')
       ON CONFLICT (user_id, grid_id, state_type)
       DO UPDATE SET state = $3
       RETURNING state`,
			[userId, gridId, state]
		);
		res.json(rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Get pivot grid state for a user and grid
router.get("/:gridId/pivot", async (req, res) => {
	try {
		const { gridId } = req.params;
		const userId = req.user.userId; // From JWT
		const { rows } = await db.query(
			"SELECT state FROM grid_state WHERE user_id = $1 AND grid_id = $2 AND state_type = 'pivot'",
			[userId, gridId]
		);
		const result = rows.length > 0 ? rows[0].state : null;
		res.json(result);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Save or update pivot grid state
router.post("/:gridId/pivot", async (req, res) => {
	try {
		const { gridId } = req.params;
		const state = req.body; // The full state object from AG Grid
		const userId = req.user.userId; // From JWT

		const { rows } = await db.query(
			`INSERT INTO grid_state (user_id, grid_id, state, state_type)
       VALUES ($1, $2, $3, 'pivot')
       ON CONFLICT (user_id, grid_id, state_type)
       DO UPDATE SET state = $3
       RETURNING state`,
			[userId, gridId, state]
		);
		res.json(rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
