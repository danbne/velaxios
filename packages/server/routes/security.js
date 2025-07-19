const express = require("express");
const router = express.Router();
const AuditLogger = require("../utils/auditLogger");
const { body, validationResult } = require("express-validator");

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
	// In a real application, you'd check user roles/permissions
	// For now, we'll allow access to security endpoints for authenticated users
	if (!req.user) {
		return res.status(401).json({ error: "Authentication required" });
	}
	next();
};

// Get audit logs
router.get("/audit-logs", requireAdmin, async (req, res) => {
	try {
		const filters = {
			userId: req.query.userId,
			action: req.query.action,
			resourceType: req.query.resourceType,
			resourceId: req.query.resourceId,
			startDate: req.query.startDate,
			endDate: req.query.endDate,
			limit: parseInt(req.query.limit) || 100,
			offset: parseInt(req.query.offset) || 0,
		};

		const logs = await AuditLogger.getAuditLogs(filters);
		res.json({ logs });
	} catch (error) {
		console.error("Error fetching audit logs:", error);
		res.status(500).json({ error: "Failed to fetch audit logs" });
	}
});

// Get security statistics
router.get("/stats", requireAdmin, async (req, res) => {
	try {
		const days = parseInt(req.query.days) || 30;
		const stats = await AuditLogger.getSecurityStats(days);
		res.json({ stats });
	} catch (error) {
		console.error("Error fetching security stats:", error);
		res.status(500).json({ error: "Failed to fetch security statistics" });
	}
});

// Get failed authentication attempts
router.get("/failed-auth", requireAdmin, async (req, res) => {
	try {
		const hours = parseInt(req.query.hours) || 24;
		const failedAttempts = await AuditLogger.getFailedAuthAttempts(hours);
		res.json({ failedAttempts });
	} catch (error) {
		console.error("Error fetching failed auth attempts:", error);
		res
			.status(500)
			.json({ error: "Failed to fetch failed authentication attempts" });
	}
});

// Get current security status
router.get("/status", requireAdmin, async (req, res) => {
	try {
		const db = require("../db");

		// Get various security metrics
		const [
			{ rows: userCount },
			{ rows: activeSessions },
			{ rows: recentLogins },
			{ rows: securityEvents },
		] = await Promise.all([
			db.query("SELECT COUNT(*) as count FROM users"),
			db.query(
				"SELECT COUNT(*) as count FROM user_sessions WHERE expires_at > CURRENT_TIMESTAMP AND is_revoked = false"
			),
			db.query(
				"SELECT COUNT(*) as count FROM audit_logs WHERE action = 'LOGIN_SUCCESS' AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'"
			),
			db.query(
				"SELECT COUNT(*) as count FROM audit_logs WHERE action LIKE 'SECURITY_%' AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'"
			),
		]);

		res.json({
			status: "healthy",
			metrics: {
				totalUsers: userCount[0].count,
				activeSessions: activeSessions[0].count,
				recentLogins: recentLogins[0].count,
				securityEvents24h: securityEvents[0].count,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Error fetching security status:", error);
		res.status(500).json({ error: "Failed to fetch security status" });
	}
});

// Clean up old audit logs (admin only)
router.delete("/audit-logs/cleanup", requireAdmin, async (req, res) => {
	try {
		const db = require("../db");
		const days = parseInt(req.query.days) || 90;

		const { rowCount } = await db.query(
			"DELETE FROM audit_logs WHERE created_at < CURRENT_DATE - INTERVAL $1 days",
			[days]
		);

		res.json({
			message: `Cleaned up ${rowCount} old audit log entries`,
			deletedCount: rowCount,
		});
	} catch (error) {
		console.error("Error cleaning up audit logs:", error);
		res.status(500).json({ error: "Failed to clean up audit logs" });
	}
});

// Get user session information
router.get("/sessions", requireAdmin, async (req, res) => {
	try {
		const db = require("../db");
		const { rows } = await db.query(`
            SELECT 
                us.session_id,
                us.user_id,
                u.email,
                us.created_at,
                us.expires_at,
                us.is_revoked,
                us.ip_address,
                us.user_agent
            FROM user_sessions us
            JOIN users u ON us.user_id = u.user_id
            WHERE us.expires_at > CURRENT_TIMESTAMP
            ORDER BY us.created_at DESC
        `);

		res.json({ sessions: rows });
	} catch (error) {
		console.error("Error fetching user sessions:", error);
		res.status(500).json({ error: "Failed to fetch user sessions" });
	}
});

// Revoke a specific session
router.delete("/sessions/:sessionId", requireAdmin, async (req, res) => {
	try {
		const { sessionId } = req.params;
		const db = require("../db");

		const { rowCount } = await db.query(
			"UPDATE user_sessions SET is_revoked = true WHERE session_id = $1",
			[sessionId]
		);

		if (rowCount === 0) {
			return res.status(404).json({ error: "Session not found" });
		}

		res.json({ message: "Session revoked successfully" });
	} catch (error) {
		console.error("Error revoking session:", error);
		res.status(500).json({ error: "Failed to revoke session" });
	}
});

// Revoke all sessions for a user
router.delete("/users/:userId/sessions", requireAdmin, async (req, res) => {
	try {
		const { userId } = req.params;
		const db = require("../db");

		const { rowCount } = await db.query(
			"UPDATE user_sessions SET is_revoked = true WHERE user_id = $1",
			[userId]
		);

		res.json({
			message: `Revoked ${rowCount} sessions for user`,
			revokedCount: rowCount,
		});
	} catch (error) {
		console.error("Error revoking user sessions:", error);
		res.status(500).json({ error: "Failed to revoke user sessions" });
	}
});

module.exports = router;
