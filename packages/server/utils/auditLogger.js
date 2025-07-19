const db = require("../db");

// Audit logging utility
class AuditLogger {
	static async logAction(
		req,
		action,
		resourceType = null,
		resourceId = null,
		additionalData = {}
	) {
		try {
			const userId = req.user?.userId || null;
			const ipAddress =
				req.ip ||
				req.connection.remoteAddress ||
				req.headers["x-forwarded-for"];
			const userAgent = req.headers["user-agent"];

			const requestData = {
				method: req.method,
				url: req.url,
				headers: {
					"user-agent": userAgent,
					referer: req.headers.referer,
					origin: req.headers.origin,
				},
				body: req.method !== "GET" ? req.body : null,
				query: req.query,
				...additionalData,
			};

			// Remove sensitive data from request body
			if (requestData.body) {
				delete requestData.body.password;
				delete requestData.body.apiKey;
				delete requestData.body.token;
			}

			await db.query(
				`INSERT INTO audit_logs 
                (user_id, action, resource_type, resource_id, ip_address, user_agent, request_data) 
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				[
					userId,
					action,
					resourceType,
					resourceId,
					ipAddress,
					userAgent,
					JSON.stringify(requestData),
				]
			);
		} catch (error) {
			console.error("Audit logging failed:", error);
			// Don't throw error to avoid breaking the main flow
		}
	}

	static async logSecurityEvent(req, event, details = {}) {
		await this.logAction(req, `SECURITY_${event}`, "security", null, details);
	}

	static async logAuthentication(req, success, details = {}) {
		const action = success ? "LOGIN_SUCCESS" : "LOGIN_FAILED";
		await this.logAction(req, action, "auth", null, details);
	}

	static async logAuthorization(
		req,
		resourceType,
		resourceId,
		success,
		details = {}
	) {
		const action = success ? "AUTHORIZATION_SUCCESS" : "AUTHORIZATION_FAILED";
		await this.logAction(req, action, resourceType, resourceId, details);
	}

	static async logDataAccess(
		req,
		resourceType,
		resourceId,
		operation,
		details = {}
	) {
		const action = `DATA_${operation.toUpperCase()}`;
		await this.logAction(req, action, resourceType, resourceId, details);
	}

	static async logConfigurationChange(
		req,
		setting,
		oldValue,
		newValue,
		details = {}
	) {
		await this.logAction(req, "CONFIG_CHANGE", "configuration", null, {
			setting,
			oldValue,
			newValue,
			...details,
		});
	}

	// Get audit logs with filtering
	static async getAuditLogs(filters = {}) {
		const {
			userId,
			action,
			resourceType,
			resourceId,
			startDate,
			endDate,
			limit = 100,
			offset = 0,
		} = filters;

		let query = `
            SELECT 
                al.log_id,
                al.user_id,
                u.email as user_email,
                al.action,
                al.resource_type,
                al.resource_id,
                al.ip_address,
                al.user_agent,
                al.request_data,
                al.created_at
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.user_id
            WHERE 1=1
        `;

		const params = [];
		let paramIndex = 1;

		if (userId) {
			query += ` AND al.user_id = $${paramIndex++}`;
			params.push(userId);
		}

		if (action) {
			query += ` AND al.action = $${paramIndex++}`;
			params.push(action);
		}

		if (resourceType) {
			query += ` AND al.resource_type = $${paramIndex++}`;
			params.push(resourceType);
		}

		if (resourceId) {
			query += ` AND al.resource_id = $${paramIndex++}`;
			params.push(resourceId);
		}

		if (startDate) {
			query += ` AND al.created_at >= $${paramIndex++}`;
			params.push(startDate);
		}

		if (endDate) {
			query += ` AND al.created_at <= $${paramIndex++}`;
			params.push(endDate);
		}

		query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
		params.push(limit, offset);

		const { rows } = await db.query(query, params);
		return rows;
	}

	// Get security statistics
	static async getSecurityStats(days = 30) {
		const { rows } = await db.query(`
            SELECT 
                action,
                COUNT(*) as count,
                DATE(created_at) as date
            FROM audit_logs 
            WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
                AND action LIKE 'SECURITY_%'
            GROUP BY action, DATE(created_at)
            ORDER BY date DESC, count DESC
        `);
		return rows;
	}

	// Get failed authentication attempts
	static async getFailedAuthAttempts(hours = 24) {
		const { rows } = await db.query(`
            SELECT 
                ip_address,
                COUNT(*) as failed_attempts,
                MAX(created_at) as last_attempt
            FROM audit_logs 
            WHERE action = 'LOGIN_FAILED'
                AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
            GROUP BY ip_address
            HAVING COUNT(*) >= 5
            ORDER BY failed_attempts DESC
        `);
		return rows;
	}
}

module.exports = AuditLogger;
