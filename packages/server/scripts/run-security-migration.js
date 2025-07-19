#!/usr/bin/env node

/**
 * Security Migration Script
 *
 * This script runs the security updates migration and sets up
 * the new security features in the database.
 */

require("dotenv").config({
	path: require("path").resolve(__dirname, "../../../.env"),
});

const fs = require("fs");
const path = require("path");
const db = require("../db");

async function runSecurityMigration() {
	console.log("🔒 Starting security migration...");

	try {
		// Read the migration file
		const migrationPath = path.join(
			__dirname,
			"../db/migrations/2024-12-security-updates.sql"
		);
		const migrationSQL = fs.readFileSync(migrationPath, "utf8");

		console.log("📄 Running security migration SQL...");

		// Split the SQL into individual statements
		const statements = migrationSQL
			.split(";")
			.map((stmt) => stmt.trim())
			.filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

		// Execute each statement
		for (let i = 0; i < statements.length; i++) {
			const statement = statements[i];
			if (statement.trim()) {
				try {
					await db.query(statement);
					console.log(`✅ Executed statement ${i + 1}/${statements.length}`);
				} catch (error) {
					// Some statements might fail if they already exist (IF NOT EXISTS)
					if (error.code === "42710" || error.code === "42P07") {
						console.log(`⚠️  Statement ${i + 1} already exists, skipping...`);
					} else {
						console.error(
							`❌ Error executing statement ${i + 1}:`,
							error.message
						);
						throw error;
					}
				}
			}
		}

		console.log("✅ Security migration completed successfully!");

		// Verify the migration
		await verifyMigration();
	} catch (error) {
		console.error("❌ Security migration failed:", error);
		process.exit(1);
	}
}

async function verifyMigration() {
	console.log("🔍 Verifying migration...");

	try {
		// Check if new tables exist
		const tables = ["user_sessions", "audit_logs", "rate_limits"];

		for (const table of tables) {
			const { rows } = await db.query(
				`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                )
            `,
				[table]
			);

			if (rows[0].exists) {
				console.log(`✅ Table '${table}' exists`);
			} else {
				console.log(`❌ Table '${table}' missing`);
			}
		}

		// Check if new columns exist in users table
		const columns = [
			"api_key_hash",
			"failed_login_attempts",
			"locked_until",
			"password_changed_at",
			"last_password_reset",
		];

		for (const column of columns) {
			const { rows } = await db.query(
				`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'users' 
                    AND column_name = $1
                )
            `,
				[column]
			);

			if (rows[0].exists) {
				console.log(`✅ Column 'users.${column}' exists`);
			} else {
				console.log(`❌ Column 'users.${column}' missing`);
			}
		}

		console.log("✅ Migration verification completed!");
	} catch (error) {
		console.error("❌ Migration verification failed:", error);
		throw error;
	}
}

async function cleanupOldData() {
	console.log("🧹 Cleaning up old data...");

	try {
		// Remove old api_key column if it exists and is empty
		const { rows } = await db.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'api_key'
        `);

		if (rows[0].count > 0) {
			// Check if api_key column has any data
			const { rows: dataCheck } = await db.query(`
                SELECT COUNT(*) as count 
                FROM users 
                WHERE api_key IS NOT NULL
            `);

			if (dataCheck[0].count === 0) {
				await db.query("ALTER TABLE users DROP COLUMN IF EXISTS api_key");
				console.log("✅ Removed old api_key column");
			} else {
				console.log("⚠️  api_key column still has data, keeping for now");
			}
		}

		console.log("✅ Cleanup completed!");
	} catch (error) {
		console.error("❌ Cleanup failed:", error);
		// Don't throw error for cleanup failures
	}
}

async function main() {
	console.log("🚀 Velaxios Security Migration Tool");
	console.log("=====================================\n");

	try {
		// Test database connection
		await db.query("SELECT 1");
		console.log("✅ Database connection successful\n");

		// Run the migration
		await runSecurityMigration();

		// Clean up old data
		await cleanupOldData();

		console.log("\n🎉 Security migration completed successfully!");
		console.log("\nNext steps:");
		console.log("1. Update your environment variables");
		console.log("2. Restart your application");
		console.log("3. Test the new security features");
		console.log("4. Review the SECURITY.md documentation");
	} catch (error) {
		console.error("\n❌ Migration failed:", error.message);
		process.exit(1);
	} finally {
		await db.pool.end();
	}
}

// Run the migration if this script is executed directly
if (require.main === module) {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}

module.exports = {
	runSecurityMigration,
	verifyMigration,
	cleanupOldData,
};
