const express = require("express");
const router = express.Router();
const db = require("../db");
const { z } = require("zod");
const { authenticate } = require("../security/auth");
const { logApiMiddleware } = require("../utils/logger");
const {
	checkFieldUnique,
	validateFieldUnique,
} = require("../utils/validation");

// Apply authentication to all project routes (supports both JWT and API key)
router.use(authenticate);

// Apply logging middleware to all project routes
router.use(logApiMiddleware);

// Get all projects or filter by project_id
router.get("/", async (req, res, next) => {
	try {
		const userId = req.user?.userId;
		const { project_number, check_unique } = req.query;

		if (project_number) {
			// Check if this is a uniqueness check request
			if (check_unique === "true") {
				const result = await checkFieldUnique(
					"project",
					"project_number",
					project_number,
					null,
					"project_id"
				);

				if (result.isUnique) {
					// Project number is unique
					return res.json({
						isUnique: true,
						message: "Project number is available",
					});
				} else {
					// Project number already exists
					return res.status(409).json({
						isUnique: false,
						error: "Project number already exists",
						message: `Project with number '${project_number}' already exists`,
						details: {
							project_number: project_number,
							existing_project_id: result.existingRecord.project_id,
						},
					});
				}
			}

			// Regular project lookup by project_number
			const { rows } = await db.query(
				"SELECT * FROM project WHERE project_number = $1",
				[project_number]
			);
			if (rows.length === 0) {
				return res.status(404).json({ error: "Project not found" });
			}
			res.json({ user: userId, project: rows[0] });
		} else {
			// Get all projects
			const { rows } = await db.query(`SELECT * FROM project`);
			res.json({ user: userId, project: rows });
		}
	} catch (error) {
		next(error);
	}
});

// Get a single project by ID
router.get("/:id", async (req, res, next) => {
	try {
		const { id } = req.params;
		const { rows } = await db.query(
			"SELECT * FROM project WHERE project_id = $1",
			[id]
		);
		if (rows.length === 0) {
			return res.status(404).json({ error: "Project not found" });
		}
		res.json(rows[0]);
	} catch (error) {
		next(error);
	}
});

// Create a new project
router.post("/", async (req, res, next) => {
	try {
		const userId = req.user?.userId;
		const projectSchema = z.object({
			project_number: z.string().min(1),
			project_name: z.string().min(1),
		});
		const parseResult = projectSchema.safeParse(req.body);
		if (!parseResult.success) {
			return res.status(400).json({
				error: "Invalid project data",
				details: parseResult.error.errors,
			});
		}
		const { project_number, project_name } = req.body;

		// Check if project_number already exists using generic validation
		const validation = await validateFieldUnique(
			"project",
			"project_number",
			project_number,
			null,
			"project_id"
		);
		if (!validation.isValid) {
			return res.status(409).json({
				error: validation.error,
				message: `Project with number '${project_number}' already exists`,
				details: validation.details,
			});
		}

		// Insert the new project
		const {
			rows: [project],
		} = await db.query(
			"INSERT INTO project (project_number, project_name, created_by, updated_by) VALUES ($1, $2, $3, $3) RETURNING *",
			[project_number, project_name, userId]
		);
		res.status(201).json(project);
	} catch (error) {
		// Handle database constraint violations specifically (as a fallback)
		if (error.code === "23505") {
			// Unique constraint violation
			return res.status(409).json({
				error: "Project number already exists",
				message: error.message,
				detail: error.detail,
				code: error.code,
				constraint: error.constraint,
				table: error.table,
				schema: error.schema,
				column: error.column,
				dataType: error.dataType,
			});
		}
		// Pass other errors to the global error handler
		next(error);
	}
});

// Update a project
router.put("/:id", async (req, res, next) => {
	try {
		const userId = req.user?.userId;
		console.log("UserId: ", userId);
		const projectUpdateSchema = z.object({
			project_number: z.string().min(1),
			project_name: z.string().min(1),
		});
		const parseResult = projectUpdateSchema.safeParse(req.body);
		if (!parseResult.success) {
			return res.status(400).json({
				error: "Invalid project update data",
				details: parseResult.error.errors,
			});
		}
		const { id } = req.params;
		const { project_number, project_name } = req.body;

		// Check if project_number already exists for a different project using generic validation
		const validation = await validateFieldUnique(
			"project",
			"project_number",
			project_number,
			id,
			"project_id"
		);
		if (!validation.isValid) {
			return res.status(409).json({
				error: validation.error,
				message: `Project with number '${project_number}' already exists`,
				details: validation.details,
			});
		}

		const { rows } = await db.query(
			"UPDATE project SET project_number = $1, project_name = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP WHERE project_id = $4 RETURNING *",
			[project_number, project_name, userId || null, id]
		);
		if (rows.length === 0) {
			return res.status(404).json({ error: "Project not found" });
		}
		res.json({ user: userId, project: rows[0] });
	} catch (error) {
		// Handle database constraint violations specifically (as a fallback)
		if (error.code === "23505") {
			// Unique constraint violation
			return res.status(409).json({
				error: "Project number already exists",
				message: error.message,
				detail: error.detail,
				code: error.code,
				constraint: error.constraint,
				table: error.table,
				schema: error.schema,
				column: error.column,
				dataType: error.dataType,
			});
		}
		next(error);
	}
});

// Delete a project
router.delete("/:id", async (req, res, next) => {
	try {
		const { id } = req.params;
		const { rows } = await db.query(
			"DELETE FROM project WHERE project_id = $1 RETURNING *",
			[id]
		);
		if (rows.length === 0) {
			return res.status(404).json({ error: "Project not found" });
		}
		res.json({ message: "Project deleted successfully" });
	} catch (error) {
		next(error);
	}
});

// Batch operations for projects (add, update, delete)
router.post("/batch", async (req, res, next) => {
	try {
		const userId = req.user?.userId;
		const { toAdd = [], toUpdate = [], toDelete = [] } = req.body;

		console.log("Batch operation received:", { toAdd, toUpdate, toDelete });

		// Validate the request structure
		if (
			!Array.isArray(toAdd) ||
			!Array.isArray(toUpdate) ||
			!Array.isArray(toDelete)
		) {
			return res.status(400).json({
				error: "Invalid batch request format",
				message: "toAdd, toUpdate, and toDelete must be arrays",
			});
		}

		// Start a database transaction
		const client = await db.pool.connect();

		try {
			await client.query("BEGIN");

			const results = {
				added: [],
				updated: [],
				deleted: [],
				errors: [],
			};

			// Validate all operations before executing any
			const validationErrors = [];

			// Validate additions
			for (const projectData of toAdd) {
				try {
					const projectSchema = z.object({
						project_number: z.string().min(1),
						project_name: z.string().min(1),
					});
					const parseResult = projectSchema.safeParse(projectData);
					if (!parseResult.success) {
						validationErrors.push({
							type: "add",
							data: projectData,
							error: "Invalid project data",
							message:
								"Both project_number and project_name are required fields",
							details: parseResult.error.errors,
						});
						continue;
					}

					// Check if project_number already exists
					const validation = await validateFieldUnique(
						"project",
						"project_number",
						projectData.project_number,
						null,
						"project_id"
					);
					if (!validation.isValid) {
						validationErrors.push({
							type: "add",
							data: projectData,
							error: validation.error,
							details: validation.details,
						});
					}
				} catch (error) {
					validationErrors.push({
						type: "add",
						data: projectData,
						error: error.message,
					});
				}
			}

			// Validate updates
			for (const projectData of toUpdate) {
				try {
					// Skip validation for rows that are also marked for deletion
					if (toDelete.includes(projectData.project_id)) {
						continue;
					}

					const projectSchema = z.object({
						project_id: z.string().uuid(),
						project_number: z.string().min(1),
						project_name: z.string().min(1),
					});
					const parseResult = projectSchema.safeParse(projectData);
					if (!parseResult.success) {
						validationErrors.push({
							type: "update",
							data: projectData,
							error: "Invalid project data",
							message:
								"Both project_number and project_name are required fields",
							details: parseResult.error.errors,
						});
						continue;
					}

					// Check if project exists
					const { rows: existing } = await client.query(
						"SELECT * FROM project WHERE project_id = $1",
						[projectData.project_id]
					);
					if (existing.length === 0) {
						validationErrors.push({
							type: "update",
							data: projectData,
							error: "Project not found",
						});
						continue;
					}

					// If project_number is being updated, check uniqueness
					if (
						projectData.project_number &&
						projectData.project_number !== existing[0].project_number
					) {
						const validation = await validateFieldUnique(
							"project",
							"project_number",
							projectData.project_number,
							projectData.project_id,
							"project_id"
						);
						if (!validation.isValid) {
							validationErrors.push({
								type: "update",
								data: projectData,
								error: validation.error,
								details: validation.details,
							});
						}
					}
				} catch (error) {
					validationErrors.push({
						type: "update",
						data: projectData,
						error: error.message,
					});
				}
			}

			// Validate deletions
			for (const projectId of toDelete) {
				try {
					// Check if project exists
					const { rows: existing } = await client.query(
						"SELECT * FROM project WHERE project_id = $1",
						[projectId]
					);
					if (existing.length === 0) {
						validationErrors.push({
							type: "delete",
							data: projectId,
							error: "Project not found",
						});
					}
				} catch (error) {
					validationErrors.push({
						type: "delete",
						data: projectId,
						error: error.message,
					});
				}
			}

			// If there are any validation errors, rollback and return them
			if (validationErrors.length > 0) {
				await client.query("ROLLBACK");
				return res.status(400).json({
					error: "Validation failed",
					message: "Some operations failed validation",
					results: {
						added: [],
						updated: [],
						deleted: [],
						errors: validationErrors,
					},
				});
			}

			// Execute all operations within the transaction
			try {
				// Handle additions
				for (const projectData of toAdd) {
					const {
						rows: [project],
					} = await client.query(
						"INSERT INTO project (project_number, project_name, created_by, updated_by) VALUES ($1, $2, $3, $3) RETURNING *",
						[projectData.project_number, projectData.project_name, userId]
					);
					results.added.push(project);
				}

				// Handle updates
				for (const projectData of toUpdate) {
					// Skip updates for rows that are also marked for deletion
					if (toDelete.includes(projectData.project_id)) {
						continue;
					}

					// Build update query dynamically
					const updateFields = [];
					const updateValues = [];
					let paramIndex = 1;

					if (projectData.project_number) {
						updateFields.push(`project_number = $${paramIndex++}`);
						updateValues.push(projectData.project_number);
					}
					if (projectData.project_name) {
						updateFields.push(`project_name = $${paramIndex++}`);
						updateValues.push(projectData.project_name);
					}

					updateFields.push(`updated_by = $${paramIndex++}`);
					updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
					updateValues.push(userId);
					updateValues.push(projectData.project_id);

					const {
						rows: [project],
					} = await client.query(
						`UPDATE project SET ${updateFields.join(
							", "
						)} WHERE project_id = $${paramIndex} RETURNING *`,
						updateValues
					);
					results.updated.push(project);
				}

				// Handle deletions
				for (const projectId of toDelete) {
					await client.query("DELETE FROM project WHERE project_id = $1", [
						projectId,
					]);
					results.deleted.push(projectId);
				}

				// Commit the transaction
				await client.query("COMMIT");

				// Return results
				res.status(200).json({
					message: "Batch operation completed successfully",
					results,
					summary: {
						added: results.added.length,
						updated: results.updated.length,
						deleted: results.deleted.length,
						errors: 0,
					},
				});
			} catch (error) {
				// If any operation fails, rollback the entire transaction
				await client.query("ROLLBACK");
				throw error;
			}
		} catch (error) {
			// Ensure rollback on any error
			try {
				await client.query("ROLLBACK");
			} catch (rollbackError) {
				console.error("Rollback failed:", rollbackError);
			}
			throw error;
		} finally {
			client.release();
		}
	} catch (error) {
		next(error);
	}
});

module.exports = router;
