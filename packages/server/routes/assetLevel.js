const express = require("express");
const router = express.Router();
const db = require("../db");
const { verifyJWT } = require("../security/auth");

const key = "assetLevel";

// Apply JWT authentication to all asset level routes
router.use(verifyJWT);

// Get all hierarchy levels for a project
router.get("/project/:projectId", async (req, res) => {
	try {
		const { projectId } = req.params;

		const { rows: levels } = await db.query(
			`SELECT 
				ald.*,
				COUNT(a.asset_id) as asset_count
			FROM asset_level_definition ald
			LEFT JOIN asset a ON ald.level_id = a.level_id
			WHERE ald.project_id = $1
			GROUP BY ald.level_id, ald.project_id, ald.level_number, ald.level_name, ald.description, ald.created_at, ald.updated_at
			ORDER BY ald.level_number`,
			[projectId]
		);

		res.json({ [key]: levels });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Update a level's name and description
router.put("/project/:projectId/level/:levelId", async (req, res) => {
	try {
		const { projectId, levelId } = req.params;
		const userId = req.user.userId;
		const { level_name, description } = req.body;

		// Validate required fields
		if (!level_name) {
			return res.status(400).json({
				error: "level_name is required",
			});
		}

		// Check if level belongs to the project
		const { rows: levelCheck } = await db.query(
			`SELECT level_id FROM asset_level_definition 
			 WHERE level_id = $1 AND project_id = $2`,
			[levelId, projectId]
		);

		if (levelCheck.length === 0) {
			return res.status(404).json({
				error: "Level not found for this project",
			});
		}

		// Update the level
		const {
			rows: [updatedLevel],
		} = await db.query(
			`UPDATE asset_level_definition 
			 SET level_name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
			 WHERE level_id = $3 AND project_id = $4
			 RETURNING *`,
			[level_name, description, levelId, projectId]
		);

		res.json({ [key]: updatedLevel });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Get a single level by ID
router.get("/level/:levelId", async (req, res) => {
	try {
		const { levelId } = req.params;

		const { rows: levels } = await db.query(
			`SELECT 
				ald.*,
				COUNT(a.asset_id) as asset_count
			FROM asset_level_definition ald
			LEFT JOIN asset a ON ald.level_id = a.level_id
			WHERE ald.level_id = $1
			GROUP BY ald.level_id, ald.project_id, ald.level_number, ald.level_name, ald.description, ald.created_at, ald.updated_at`,
			[levelId]
		);

		if (levels.length === 0) {
			return res.status(404).json({ error: "Level not found" });
		}

		res.json({ [key]: levels[0] });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
