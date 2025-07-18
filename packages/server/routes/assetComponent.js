const express = require("express");
const router = express.Router();
const db = require("../db");
const { verifyJWT } = require("../security/auth");

const key = "assetComponent";

// Apply JWT authentication to all asset component routes
router.use(verifyJWT);

// Get all components for an asset
router.get("/asset/:assetId", async (req, res) => {
	try {
		const { assetId } = req.params;

		// Check if asset exists
		const { rows: assetCheck } = await db.query(
			`SELECT asset_id FROM asset WHERE asset_id = $1`,
			[assetId]
		);

		if (assetCheck.length === 0) {
			return res.status(404).json({ error: "Asset not found" });
		}

		const { rows: components } = await db.query(
			`SELECT 
				ac.*,
				u1.email as created_by_email,
				u2.email as updated_by_email
			FROM asset_component ac
			LEFT JOIN users u1 ON ac.created_by = u1.user_id
			LEFT JOIN users u2 ON ac.updated_by = u2.user_id
			WHERE ac.asset_id = $1
			ORDER BY ac.created_at`,
			[assetId]
		);

		res.json({ [key]: components });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Add a component to an asset
router.post("/asset/:assetId", async (req, res) => {
	try {
		const { assetId } = req.params;
		const userId = req.user.userId;
		const {
			name,
			description,
			component_type,
			manufacturer,
			model_number,
			serial_number,
			installation_date,
			warranty_expiry,
			status = "active",
			metadata,
		} = req.body;

		// Validate required fields
		if (!name) {
			return res.status(400).json({
				error: "name is required",
			});
		}

		// Check if asset exists
		const { rows: assetCheck } = await db.query(
			`SELECT asset_id FROM asset WHERE asset_id = $1`,
			[assetId]
		);

		if (assetCheck.length === 0) {
			return res.status(404).json({ error: "Asset not found" });
		}

		// Create the component
		const {
			rows: [newComponent],
		} = await db.query(
			`INSERT INTO asset_component (
				asset_id, name, description, component_type, manufacturer,
				model_number, serial_number, installation_date, warranty_expiry,
				status, metadata, created_by, updated_by
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
			RETURNING *`,
			[
				assetId,
				name,
				description,
				component_type,
				manufacturer,
				model_number,
				serial_number,
				installation_date,
				warranty_expiry,
				status,
				metadata,
				userId,
				userId,
			]
		);

		res.status(201).json({ [key]: newComponent });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Update a component
router.put("/asset/:assetId/component/:componentId", async (req, res) => {
	try {
		const { assetId, componentId } = req.params;
		const userId = req.user.userId;
		const {
			name,
			description,
			component_type,
			manufacturer,
			model_number,
			serial_number,
			installation_date,
			warranty_expiry,
			status,
			metadata,
		} = req.body;

		// Check if component exists and belongs to the asset
		const { rows: componentCheck } = await db.query(
			`SELECT component_id FROM asset_component 
			 WHERE component_id = $1 AND asset_id = $2`,
			[componentId, assetId]
		);

		if (componentCheck.length === 0) {
			return res.status(404).json({ error: "Component not found" });
		}

		// Build update query dynamically
		const updateFields = [];
		const values = [];
		let paramCount = 1;

		if (name !== undefined) {
			updateFields.push(`name = $${paramCount++}`);
			values.push(name);
		}
		if (description !== undefined) {
			updateFields.push(`description = $${paramCount++}`);
			values.push(description);
		}
		if (component_type !== undefined) {
			updateFields.push(`component_type = $${paramCount++}`);
			values.push(component_type);
		}
		if (manufacturer !== undefined) {
			updateFields.push(`manufacturer = $${paramCount++}`);
			values.push(manufacturer);
		}
		if (model_number !== undefined) {
			updateFields.push(`model_number = $${paramCount++}`);
			values.push(model_number);
		}
		if (serial_number !== undefined) {
			updateFields.push(`serial_number = $${paramCount++}`);
			values.push(serial_number);
		}
		if (installation_date !== undefined) {
			updateFields.push(`installation_date = $${paramCount++}`);
			values.push(installation_date);
		}
		if (warranty_expiry !== undefined) {
			updateFields.push(`warranty_expiry = $${paramCount++}`);
			values.push(warranty_expiry);
		}
		if (status !== undefined) {
			updateFields.push(`status = $${paramCount++}`);
			values.push(status);
		}
		if (metadata !== undefined) {
			updateFields.push(`metadata = $${paramCount++}`);
			values.push(metadata);
		}

		// Add updated_by and updated_at
		updateFields.push(`updated_by = $${paramCount++}`);
		values.push(userId);
		updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

		values.push(componentId);
		values.push(assetId);

		const {
			rows: [updatedComponent],
		} = await db.query(
			`UPDATE asset_component SET ${updateFields.join(", ")} 
			 WHERE component_id = $${paramCount} AND asset_id = $${paramCount + 1} 
			 RETURNING *`,
			values
		);

		res.json({ [key]: updatedComponent });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Delete a component
router.delete("/asset/:assetId/component/:componentId", async (req, res) => {
	try {
		const { assetId, componentId } = req.params;

		// Check if component exists and belongs to the asset
		const { rows: componentCheck } = await db.query(
			`SELECT component_id FROM asset_component 
			 WHERE component_id = $1 AND asset_id = $2`,
			[componentId, assetId]
		);

		if (componentCheck.length === 0) {
			return res.status(404).json({ error: "Component not found" });
		}

		// Delete the component
		await db.query(
			`DELETE FROM asset_component WHERE component_id = $1 AND asset_id = $2`,
			[componentId, assetId]
		);

		res.json({ message: "Component deleted successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Get a single component by ID
router.get("/component/:componentId", async (req, res) => {
	try {
		const { componentId } = req.params;

		const { rows: components } = await db.query(
			`SELECT 
				ac.*,
				u1.email as created_by_email,
				u2.email as updated_by_email
			FROM asset_component ac
			LEFT JOIN users u1 ON ac.created_by = u1.user_id
			LEFT JOIN users u2 ON ac.updated_by = u2.user_id
			WHERE ac.component_id = $1`,
			[componentId]
		);

		if (components.length === 0) {
			return res.status(404).json({ error: "Component not found" });
		}

		res.json(components[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
