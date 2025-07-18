const db = require("../db");

/**
 * Log an API call to the database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} options - Additional options
 * @param {number} options.executionTime - Execution time in milliseconds
 * @param {Object} options.responseBody - Response body to log
 * @param {number} options.responseStatus - Response status code
 */
const logApiCall = async (req, res, options = {}) => {
	try {
		const {
			executionTime = 0,
			responseBody = null,
			responseStatus = res.statusCode,
		} = options;

		// Get user ID from authenticated request
		const userId = req.user?.userId || null;

		// Prepare request body (exclude sensitive data)
		let requestBody = null;
		if (req.body && Object.keys(req.body).length > 0) {
			requestBody = { ...req.body };
			// Remove sensitive fields if needed
			delete requestBody.password;
			delete requestBody.token;
		}

		// Prepare request parameters
		const requestParams = {
			query: req.query,
			params: req.params,
			headers: {
				"content-type": req.get("content-type"),
				"user-agent": req.get("user-agent"),
				// Don't log sensitive headers
				// 'authorization': req.get('authorization'),
				// 'x-api-key': req.get('x-api-key'),
			},
		};

		// Get IP address
		const ipAddress =
			req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"];

		// Get user agent
		const userAgent = req.get("user-agent");

		// Extract route name from the request path
		// For project routes, this will be "project"
		const routeName = req.baseUrl
			? req.baseUrl.replace("/api/", "")
			: req.path.split("/")[2]; // Skip /api/ part

		// Insert log into database
		await db.query(
			`INSERT INTO api_logs (
                user_id, method, url, route_name, request_body, request_params, 
                response_body, response_status, execution_time_ms, 
                ip_address, user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
			[
				userId,
				req.method,
				req.originalUrl,
				routeName,
				requestBody ? JSON.stringify(requestBody) : null,
				JSON.stringify(requestParams),
				null,
				responseStatus,
				executionTime,
				ipAddress,
				userAgent,
			]
		);
	} catch (error) {
		// Don't let logging errors break the main functionality
		console.error("Error logging API call:", error);
	}
};

/**
 * Middleware to wrap response and log API calls
 */
const logApiMiddleware = (req, res, next) => {
	const startTime = Date.now();

	// Store original send method
	const originalSend = res.send;

	// Override send method to capture response
	res.send = function (data) {
		const executionTime = Date.now() - startTime;

		// Parse response data
		let responseBody = null;
		try {
			responseBody = typeof data === "string" ? JSON.parse(data) : data;
		} catch (e) {
			responseBody = data;
		}

		// Log the API call
		logApiCall(req, res, {
			executionTime,
			responseBody,
			responseStatus: res.statusCode,
		});

		// Call original send method
		return originalSend.call(this, data);
	};

	next();
};

module.exports = {
	logApiCall,
	logApiMiddleware,
};
