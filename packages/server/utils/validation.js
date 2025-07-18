const db = require("../db");

/**
 * Generic function to check if a field value is unique in a table
 * @param {string} tableName - The table to check
 * @param {string} fieldName - The field to check for uniqueness
 * @param {string} fieldValue - The value to check
 * @param {string} excludeId - Optional ID to exclude from check (for updates)
 * @param {string} idField - The ID field name (defaults to 'id')
 * @returns {Promise<{isUnique: boolean, existingRecord?: any}>}
 */
const checkFieldUnique = async (
	tableName,
	fieldName,
	fieldValue,
	excludeId = null,
	idField = "id"
) => {
	try {
		let query = `SELECT ${idField} FROM ${tableName} WHERE ${fieldName} = $1`;
		let params = [fieldValue];

		if (excludeId) {
			query += ` AND ${idField} != $2`;
			params.push(excludeId);
		}

		const { rows } = await db.query(query, params);

		if (rows.length === 0) {
			return { isUnique: true };
		} else {
			return {
				isUnique: false,
				existingRecord: rows[0],
			};
		}
	} catch (error) {
		console.error(
			`Error checking ${fieldName} uniqueness in ${tableName}:`,
			error
		);
		throw error;
	}
};

/**
 * Generic function to validate field uniqueness and return appropriate response
 * @param {string} tableName - The table to check
 * @param {string} fieldName - The field to check for uniqueness
 * @param {string} fieldValue - The value to check
 * @param {string} excludeId - Optional ID to exclude from check (for updates)
 * @param {string} idField - The ID field name (defaults to 'id')
 * @returns {Promise<{isValid: boolean, error?: string, details?: any}>}
 */
const validateFieldUnique = async (
	tableName,
	fieldName,
	fieldValue,
	excludeId = null,
	idField = "id"
) => {
	if (!fieldValue || fieldValue.trim() === "") {
		return {
			isValid: false,
			error: `${fieldName} is required`,
		};
	}

	try {
		const result = await checkFieldUnique(
			tableName,
			fieldName,
			fieldValue,
			excludeId,
			idField
		);

		if (result.isUnique) {
			return { isValid: true };
		} else {
			return {
				isValid: false,
				error: `${fieldName} already exists`,
				details: {
					[fieldName]: fieldValue,
					existingRecordId: result.existingRecord[idField],
				},
			};
		}
	} catch (error) {
		return {
			isValid: false,
			error: `Error checking ${fieldName} availability`,
		};
	}
};

/**
 * Middleware to check field uniqueness before database operations
 * @param {string} tableName - The table to check
 * @param {string} fieldName - The field to check for uniqueness
 * @param {string} idField - The ID field name (defaults to 'id')
 * @returns {Function} Express middleware
 */
const createUniquenessMiddleware = (tableName, fieldName, idField = "id") => {
	return async (req, res, next) => {
		try {
			const fieldValue = req.body[fieldName];
			const excludeId = req.params.id || req.params[idField]; // For updates

			const validation = await validateFieldUnique(
				tableName,
				fieldName,
				fieldValue,
				excludeId,
				idField
			);

			if (!validation.isValid) {
				return res.status(409).json({
					error: validation.error,
					details: validation.details,
				});
			}

			next();
		} catch (error) {
			next(error);
		}
	};
};

module.exports = {
	checkFieldUnique,
	validateFieldUnique,
	createUniquenessMiddleware,
};
