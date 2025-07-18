const express = require("express");
const router = express.Router();
const db = require("../db");
const { verifyJWT } = require("../security/auth");

const key = "assetPhoto";

// Apply JWT authentication to all asset photo routes
router.use(verifyJWT);

// Get all photos for an asset
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

		res.json({ [key]: photos });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Add a photo to an asset
router.post("/asset/:assetId", async (req, res) => {
	try {
		const { assetId } = req.params;
		const userId = req.user.userId;
		const {
			photo_url,
			photo_name,
			is_primary = false,
			photo_order = 0,
			description,
		} = req.body;

		// Validate required fields
		if (!photo_url) {
			return res.status(400).json({
				error: "photo_url is required",
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

		// If this photo is being set as primary, unset all other primary photos
		if (is_primary) {
			await db.query(
				`UPDATE asset_photo 
				 SET is_primary = FALSE, updated_at = CURRENT_TIMESTAMP
				 WHERE asset_id = $1`,
				[assetId]
			);
		}

		// Create the photo
		const {
			rows: [newPhoto],
		} = await db.query(
			`INSERT INTO asset_photo (
				asset_id, photo_url, photo_name, is_primary, photo_order, 
				description, created_by, updated_by
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING *`,
			[
				assetId,
				photo_url,
				photo_name,
				is_primary,
				photo_order,
				description,
				userId,
				userId,
			]
		);

		// Update asset's primary_photo_url if this is the primary photo
		if (is_primary) {
			await db.query(
				`UPDATE asset 
				 SET primary_photo_url = $1, updated_at = CURRENT_TIMESTAMP
				 WHERE asset_id = $2`,
				[photo_url, assetId]
			);
		}

		res.status(201).json({ [key]: newPhoto });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Update a photo
router.put("/asset/:assetId/photo/:photoId", async (req, res) => {
	try {
		const { assetId, photoId } = req.params;
		const userId = req.user.userId;
		const { photo_url, photo_name, is_primary, photo_order, description } =
			req.body;

		// Check if photo exists and belongs to the asset
		const { rows: photoCheck } = await db.query(
			`SELECT photo_id FROM asset_photo 
			 WHERE photo_id = $1 AND asset_id = $2`,
			[photoId, assetId]
		);

		if (photoCheck.length === 0) {
			return res.status(404).json({ error: "Photo not found" });
		}

		// If this photo is being set as primary, unset all other primary photos
		if (is_primary) {
			await db.query(
				`UPDATE asset_photo 
				 SET is_primary = FALSE, updated_at = CURRENT_TIMESTAMP
				 WHERE asset_id = $1 AND photo_id != $2`,
				[assetId, photoId]
			);
		}

		// Build update query dynamically
		const updateFields = [];
		const values = [];
		let paramCount = 1;

		if (photo_url !== undefined) {
			updateFields.push(`photo_url = $${paramCount++}`);
			values.push(photo_url);
		}
		if (photo_name !== undefined) {
			updateFields.push(`photo_name = $${paramCount++}`);
			values.push(photo_name);
		}
		if (is_primary !== undefined) {
			updateFields.push(`is_primary = $${paramCount++}`);
			values.push(is_primary);
		}
		if (photo_order !== undefined) {
			updateFields.push(`photo_order = $${paramCount++}`);
			values.push(photo_order);
		}
		if (description !== undefined) {
			updateFields.push(`description = $${paramCount++}`);
			values.push(description);
		}

		// Add updated_by and updated_at
		updateFields.push(`updated_by = $${paramCount++}`);
		values.push(userId);
		updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

		values.push(photoId);
		values.push(assetId);

		const {
			rows: [updatedPhoto],
		} = await db.query(
			`UPDATE asset_photo SET ${updateFields.join(", ")} 
			 WHERE photo_id = $${paramCount} AND asset_id = $${paramCount + 1} 
			 RETURNING *`,
			values
		);

		// Update asset's primary_photo_url if primary photo changed
		if (is_primary !== undefined) {
			if (is_primary) {
				await db.query(
					`UPDATE asset 
					 SET primary_photo_url = $1, updated_at = CURRENT_TIMESTAMP
					 WHERE asset_id = $2`,
					[updatedPhoto.photo_url, assetId]
				);
			} else {
				// Check if this was the primary photo and clear it
				const { rows: primaryCheck } = await db.query(
					`SELECT COUNT(*) as count FROM asset_photo 
					 WHERE asset_id = $1 AND is_primary = TRUE`,
					[assetId]
				);

				if (primaryCheck[0].count === 0) {
					await db.query(
						`UPDATE asset 
						 SET primary_photo_url = NULL, updated_at = CURRENT_TIMESTAMP
						 WHERE asset_id = $1`,
						[assetId]
					);
				}
			}
		}

		res.json({ [key]: updatedPhoto });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Delete a photo
router.delete("/asset/:assetId/photo/:photoId", async (req, res) => {
	try {
		const { assetId, photoId } = req.params;

		// Check if photo exists and get its details
		const { rows: photoCheck } = await db.query(
			`SELECT photo_id, is_primary, photo_url FROM asset_photo 
			 WHERE photo_id = $1 AND asset_id = $2`,
			[photoId, assetId]
		);

		if (photoCheck.length === 0) {
			return res.status(404).json({ error: "Photo not found" });
		}

		const photo = photoCheck[0];

		// Delete the photo
		await db.query(
			`DELETE FROM asset_photo WHERE photo_id = $1 AND asset_id = $2`,
			[photoId, assetId]
		);

		// If this was the primary photo, clear the asset's primary_photo_url
		if (photo.is_primary) {
			await db.query(
				`UPDATE asset 
				 SET primary_photo_url = NULL, updated_at = CURRENT_TIMESTAMP
				 WHERE asset_id = $1`,
				[assetId]
			);
		}

		res.json({ message: "Photo deleted successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
