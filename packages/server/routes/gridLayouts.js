const express = require("express");
const router = express.Router();
const db = require("../db");

const key = "gridLayout";

// Get all layouts for a user and grid
router.get("/:gridId", async (req, res) => {
	try {
		const { gridId } = req.params;
		const userId = req.user.userId;

		const { rows } = await db.query(
			"SELECT layout_id, layout_name, is_default, created_at, updated_at FROM grid_layouts WHERE user_id = $1 AND grid_id = $2 ORDER BY is_default DESC, layout_name ASC",
			[userId, gridId]
		);

		res.json({ [key]: rows });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Get a specific layout
router.get("/:gridId/:layoutId", async (req, res) => {
	try {
		const { gridId, layoutId } = req.params;
		const userId = req.user.userId;

		const { rows } = await db.query(
			"SELECT layout_id, layout_name, layout_data, is_default, created_at, updated_at FROM grid_layouts WHERE layout_id = $1 AND user_id = $2 AND grid_id = $3",
			[layoutId, userId, gridId]
		);

		if (rows.length === 0) {
			return res.status(404).json({ error: "Layout not found" });
		}

		res.json({ [key]: rows[0] });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Create a new layout
router.post("/:gridId", async (req, res) => {
	try {
		const { gridId } = req.params;
		const { layoutName, layoutData, isDefault = false } = req.body;
		const userId = req.user.userId;

		// Validate required fields
		if (!layoutName || !layoutData) {
			return res
				.status(400)
				.json({ error: "Layout name and data are required" });
		}

		// Check if layout name already exists for this user/grid
		const existingLayout = await db.query(
			"SELECT layout_id FROM grid_layouts WHERE user_id = $1 AND grid_id = $2 AND layout_name = $3",
			[userId, gridId, layoutName]
		);

		if (existingLayout.rows.length > 0) {
			return res.status(409).json({ error: "Layout name already exists" });
		}

		// If this is a default layout, unset any existing default
		if (isDefault) {
			await db.query(
				"UPDATE grid_layouts SET is_default = false WHERE user_id = $1 AND grid_id = $2",
				[userId, gridId]
			);
		}

		const { rows } = await db.query(
			"INSERT INTO grid_layouts (user_id, grid_id, layout_name, layout_data, is_default) VALUES ($1, $2, $3, $4, $5) RETURNING layout_id, layout_name, is_default, created_at, updated_at",
			[userId, gridId, layoutName, layoutData, isDefault]
		);

		res.status(201).json({ [key]: rows[0] });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Update a layout
router.put("/:gridId/:layoutId", async (req, res) => {
	try {
		const { gridId, layoutId } = req.params;
		const { layoutName, layoutData, isDefault } = req.body;
		const userId = req.user.userId;

		// Check if layout exists and belongs to user
		const existingLayout = await db.query(
			"SELECT layout_id, layout_name, is_default FROM grid_layouts WHERE layout_id = $1 AND user_id = $2 AND grid_id = $3",
			[layoutId, userId, gridId]
		);

		if (existingLayout.rows.length === 0) {
			return res.status(404).json({ error: "Layout not found" });
		}

		const layout = existingLayout.rows[0];

		// If this is the default layout, prevent deletion
		if (layout.is_default && layoutName === "My Layout") {
			return res
				.status(400)
				.json({ error: "Cannot modify the default 'My Layout'" });
		}

		// If changing name, check for conflicts
		if (layoutName && layoutName !== layout.layout_name) {
			const nameConflict = await db.query(
				"SELECT layout_id FROM grid_layouts WHERE user_id = $1 AND grid_id = $2 AND layout_name = $3 AND layout_id != $4",
				[userId, gridId, layoutName, layoutId]
			);

			if (nameConflict.rows.length > 0) {
				return res.status(409).json({ error: "Layout name already exists" });
			}
		}

		// If setting as default, unset any existing default
		if (isDefault) {
			await db.query(
				"UPDATE grid_layouts SET is_default = false WHERE user_id = $1 AND grid_id = $2",
				[userId, gridId]
			);
		}

		// Build update query dynamically
		const updateFields = [];
		const updateValues = [];
		let paramIndex = 1;

		if (layoutName !== undefined) {
			updateFields.push(`layout_name = $${paramIndex++}`);
			updateValues.push(layoutName);
		}

		if (layoutData !== undefined) {
			updateFields.push(`layout_data = $${paramIndex++}`);
			updateValues.push(layoutData);
		}

		if (isDefault !== undefined) {
			updateFields.push(`is_default = $${paramIndex++}`);
			updateValues.push(isDefault);
		}

		updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

		const { rows } = await db.query(
			`UPDATE grid_layouts SET ${updateFields.join(
				", "
			)} WHERE layout_id = $${paramIndex} AND user_id = $${
				paramIndex + 1
			} AND grid_id = $${
				paramIndex + 2
			} RETURNING layout_id, layout_name, is_default, updated_at`,
			[...updateValues, layoutId, userId, gridId]
		);

		res.json({ [key]: rows[0] });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Delete a layout
router.delete("/:gridId/:layoutId", async (req, res) => {
	try {
		const { gridId, layoutId } = req.params;
		const userId = req.user.userId;

		// Check if layout exists and is not the default
		const existingLayout = await db.query(
			"SELECT layout_id, layout_name, is_default FROM grid_layouts WHERE layout_id = $1 AND user_id = $2 AND grid_id = $3",
			[layoutId, userId, gridId]
		);

		if (existingLayout.rows.length === 0) {
			return res.status(404).json({ error: "Layout not found" });
		}

		const layout = existingLayout.rows[0];

		// Prevent deletion of default layout
		if (layout.is_default || layout.layout_name === "My Layout") {
			return res
				.status(400)
				.json({ error: "Cannot delete the default layout" });
		}

		await db.query(
			"DELETE FROM grid_layouts WHERE layout_id = $1 AND user_id = $2 AND grid_id = $3",
			[layoutId, userId, gridId]
		);

		res.status(204).send();
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Get or create default layout for a user/grid
router.get("/:gridId/default/ensure", async (req, res) => {
	try {
		const { gridId } = req.params;
		const userId = req.user.userId;

		// Check if default layout exists
		const { rows } = await db.query(
			"SELECT layout_id, layout_name, layout_data, is_default FROM grid_layouts WHERE user_id = $1 AND grid_id = $2 AND is_default = true",
			[userId, gridId]
		);

		if (rows.length > 0) {
			// Default layout exists, return it
			res.json({ [key]: rows[0] });
		} else {
			// Create default layout
			const defaultLayoutData = {}; // Empty layout data
			const { rows: newLayout } = await db.query(
				"INSERT INTO grid_layouts (user_id, grid_id, layout_name, layout_data, is_default) VALUES ($1, $2, $3, $4, $5) RETURNING layout_id, layout_name, layout_data, is_default",
				[userId, gridId, "My Layout", defaultLayoutData, true]
			);

			res.status(201).json({ [key]: newLayout[0] });
		}
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
