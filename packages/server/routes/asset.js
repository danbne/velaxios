const express = require("express");
const router = express.Router();
const db = require("../db");
const { verifyJWT } = require("../security/auth");
const { z } = require("zod");

const key = "asset";

// Apply JWT authentication to all asset routes
router.use(verifyJWT);

// Get all assets for a project (with optional tree structure)
router.get("/project/:projectId", async (req, res) => {
	try {
		const { projectId } = req.params;
		// Always return a flat list for both tree and flat view
		const { rows: assets } = await db.query(
			`SELECT 
				a.*,
				u1.email as created_by_email,
				u2.email as updated_by_email
			FROM asset a
			LEFT JOIN users u1 ON a.created_by = u1.user_id
			LEFT JOIN users u2 ON a.updated_by = u2.user_id
			WHERE a.project_id = $1
			ORDER BY a.name`,
			[projectId]
		);

		// Compute level and hierarchy path for each asset
		const assetMap = new Map();
		assets.forEach((asset) => assetMap.set(asset.asset_id, asset));
		function computeLevel(asset) {
			let level = 1;
			let current = asset;
			while (current.parent_asset_id) {
				level++;
				current = assetMap.get(current.parent_asset_id);
				if (!current) break;
			}
			return level;
		}
		function computeHierarchyPath(asset) {
			const ids = [];
			const numbers = [];
			const names = [];
			const descriptions = [];
			let current = asset;
			while (current) {
				ids.unshift(current.asset_id);
				numbers.unshift(current.asset_number || current.asset_id);
				names.unshift(current.name);
				descriptions.unshift(current.description || "");
				current = current.parent_asset_id
					? assetMap.get(current.parent_asset_id)
					: null;
			}
			return { ids, numbers, names, descriptions };
		}
		assets.forEach((asset) => {
			asset.level = computeLevel(asset);
			const path = computeHierarchyPath(asset);
			asset.hierarchy_path_ids = path.ids;
			asset.hierarchy_path_numbers = path.numbers;
			asset.hierarchy_path_names = path.names;
			asset.hierarchy_path_descriptions = path.descriptions;
		});

		// Always return flat list
		res.json({ [key]: assets });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Get a single asset by ID with details
router.get("/:assetId", async (req, res) => {
	try {
		const { assetId } = req.params;

		// Get asset
		const { rows: assets } = await db.query(
			`SELECT 
				a.*,
				u1.email as created_by_email,
				u2.email as updated_by_email
			FROM asset a
			LEFT JOIN users u1 ON a.created_by = u1.user_id
			LEFT JOIN users u2 ON a.updated_by = u2.user_id
			WHERE a.asset_id = $1`,
			[assetId]
		);

		if (assets.length === 0) {
			return sendError(res, 404, "Asset not found");
		}

		const asset = assets[0];

		// Compute level for this asset
		let level = 1;
		let current = asset;
		while (current.parent_asset_id) {
			const { rows: parentRows } = await db.query(
				`SELECT * FROM asset WHERE asset_id = $1`,
				[current.parent_asset_id]
			);
			if (parentRows.length === 0) break;
			current = parentRows[0];
			level++;
		}
		asset.level = level;

		// Get photos for this asset
		const { rows: photos } = await db.query(
			`SELECT 
				ap.*,
				u.email as created_by_email
			FROM asset_photo ap
			LEFT JOIN users u ON ap.created_by = u.user_id
			WHERE ap.asset_id = $1
			ORDER BY ap.is_primary DESC, ap.photo_order, ap.created_at`,
			[assetId]
		);

		// Get components for this asset
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

		// Get child assets
		const { rows: children } = await db.query(
			`SELECT 
				a.*
			FROM asset a
			WHERE a.parent_asset_id = $1
			ORDER BY a.name`,
			[assetId]
		);

		asset.photos = photos;
		asset.components = components;
		asset.children = children;

		res.json({ [key]: asset });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Create a new asset
router.post("/project/:projectId", async (req, res) => {
	const assetSchema = z.object({
		parent_asset_id: z.string().uuid().optional().nullable(),
		name: z.string().min(1),
		asset_number: z.string().optional().nullable(),
		description: z.string().optional().nullable(),
		location: z.string().optional().nullable(),
		status: z.string().optional(),
		metadata: z.any().optional(),
	});
	const parseResult = assetSchema.safeParse(req.body);
	if (!parseResult.success) {
		return sendError(res, 400, "Invalid asset data", parseResult.error.errors);
	}
	try {
		const { projectId } = req.params;
		const userId = req.user.userId;
		const {
			parent_asset_id,
			name,
			asset_number,
			description,
			location,
			status = "active",
			metadata,
		} = req.body;

		// Validate required fields
		if (!name) {
			return sendError(res, 400, "Name is required");
		}

		// If parent_asset_id is provided, validate it belongs to the same project
		if (parent_asset_id) {
			const { rows: parentCheck } = await db.query(
				`SELECT asset_id FROM asset 
				 WHERE asset_id = $1 AND project_id = $2`,
				[parent_asset_id, projectId]
			);

			if (parentCheck.length === 0) {
				return sendError(res, 400, "Invalid parent_asset_id for this project");
			}
		}

		// Create the asset
		const {
			rows: [newAsset],
		} = await db.query(
			`INSERT INTO asset (
				project_id, parent_asset_id, name, asset_number, description, 
				location, status, metadata, created_by, updated_by
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING *`,
			[
				projectId,
				parent_asset_id,
				name,
				asset_number,
				description,
				location,
				status,
				metadata,
				userId,
				userId,
			]
		);

		res.status(201).json(newAsset);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Update an asset
router.put("/:assetId", async (req, res) => {
	const assetUpdateSchema = z.object({
		parent_asset_id: z.string().uuid().optional().nullable(),
		name: z.string().min(1).optional(),
		asset_number: z.string().optional().nullable(),
		description: z.string().optional().nullable(),
		location: z.string().optional().nullable(),
		status: z.string().optional(),
		metadata: z.any().optional(),
	});
	const parseResult = assetUpdateSchema.safeParse(req.body);
	if (!parseResult.success) {
		return sendError(
			res,
			400,
			"Invalid asset update data",
			parseResult.error.errors
		);
	}
	try {
		const { assetId } = req.params;
		const userId = req.user.userId;
		const {
			parent_asset_id,
			name,
			asset_number,
			description,
			location,
			status,
			metadata,
		} = req.body;

		// Get current asset to validate project
		const { rows: currentAsset } = await db.query(
			`SELECT project_id FROM asset WHERE asset_id = $1`,
			[assetId]
		);

		if (currentAsset.length === 0) {
			return sendError(res, 404, "Asset not found");
		}

		const projectId = currentAsset[0].project_id;

		// Validate parent_asset_id if provided
		if (parent_asset_id) {
			const { rows: parentCheck } = await db.query(
				`SELECT asset_id FROM asset 
				 WHERE asset_id = $1 AND project_id = $2`,
				[parent_asset_id, projectId]
			);

			if (parentCheck.length === 0) {
				return sendError(res, 400, "Invalid parent_asset_id for this project");
			}

			// Prevent circular references
			if (parent_asset_id === assetId) {
				return sendError(res, 400, "Asset cannot be its own parent");
			}
		}

		// Build update query dynamically
		const updateFields = [];
		const values = [];
		let paramCount = 1;

		if (parent_asset_id !== undefined) {
			updateFields.push(`parent_asset_id = $${paramCount++}`);
			values.push(parent_asset_id);
		}
		if (name !== undefined) {
			updateFields.push(`name = $${paramCount++}`);
			values.push(name);
		}
		if (asset_number !== undefined) {
			updateFields.push(`asset_number = $${paramCount++}`);
			values.push(asset_number);
		}
		if (description !== undefined) {
			updateFields.push(`description = $${paramCount++}`);
			values.push(description);
		}
		if (location !== undefined) {
			updateFields.push(`location = $${paramCount++}`);
			values.push(location);
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

		values.push(assetId);

		const {
			rows: [updatedAsset],
		} = await db.query(
			`UPDATE asset SET ${updateFields.join(", ")} 
			 WHERE asset_id = $${paramCount} RETURNING *`,
			values
		);

		res.json(updatedAsset);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Delete an asset (and all descendants)
router.delete("/:assetId", async (req, res) => {
	try {
		const { assetId } = req.params;

		// Check if asset exists
		const { rows: assetCheck } = await db.query(
			`SELECT asset_id FROM asset WHERE asset_id = $1`,
			[assetId]
		);

		if (assetCheck.length === 0) {
			return sendError(res, 404, "Asset not found");
		}

		// Delete asset and all descendants (cascade will handle photos and components)
		const { rows } = await db.query(
			`DELETE FROM asset WHERE asset_id = $1 RETURNING asset_id`,
			[assetId]
		);

		res.json({ message: "Asset deleted successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
