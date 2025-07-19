#!/usr/bin/env node

/**
 * API Key Migration Script
 *
 * This script migrates existing plain API keys to hashed API keys
 * in the database. It handles the transition from the old api_key
 * column to the new api_key_hash column.
 */

require("dotenv").config({
	path: require("path").resolve(__dirname, "../../../.env"),
});

const crypto = require("crypto");
const db = require("../db");

// Fallback hash function (same as in auth.js)
const hashApiKey = async (apiKey) => {
	return crypto.createHash("sha256").update(apiKey).digest("hex");
};

async function checkCurrentState() {
	console.log("🔍 Checking current database state...");

	try {
		// Check if api_key_hash column exists
		const { rows: columnCheck } = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'users' 
                AND column_name = 'api_key_hash'
            )
        `);

		if (!columnCheck[0].exists) {
			console.log(
				"❌ api_key_hash column does not exist. Run the security migration first."
			);
			return false;
		}

		// Check if api_key column exists and has data
		const { rows: oldColumnCheck } = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'users' 
                AND column_name = 'api_key'
            )
        `);

		if (!oldColumnCheck[0].exists) {
			console.log("✅ No old api_key column found. Migration not needed.");
			return true;
		}

		// Check how many users have API keys
		const { rows: apiKeyCount } = await db.query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE api_key IS NOT NULL AND api_key != ''
        `);

		console.log(`📊 Found ${apiKeyCount[0].count} users with API keys`);

		return apiKeyCount[0].count;
	} catch (error) {
		console.error("❌ Error checking database state:", error.message);
		return false;
	}
}

async function migrateApiKeys() {
	console.log("🔄 Starting API key migration...");

	try {
		// Get all users with plain API keys
		const { rows: users } = await db.query(`
            SELECT user_id, email, api_key 
            FROM users 
            WHERE api_key IS NOT NULL AND api_key != ''
        `);

		if (users.length === 0) {
			console.log("✅ No API keys to migrate");
			return true;
		}

		console.log(`🔄 Migrating ${users.length} API keys...`);

		let migrated = 0;
		let errors = 0;

		for (const user of users) {
			try {
				// Hash the API key
				const hashedApiKey = await hashApiKey(user.api_key);

				// Update the user with hashed API key
				await db.query(
					`
                    UPDATE users 
                    SET api_key_hash = $1 
                    WHERE user_id = $2
                `,
					[hashedApiKey, user.user_id]
				);

				console.log(`✅ Migrated API key for user: ${user.email}`);
				migrated++;
			} catch (error) {
				console.error(
					`❌ Failed to migrate API key for user ${user.email}:`,
					error.message
				);
				errors++;
			}
		}

		console.log(`\n📊 Migration Summary:`);
		console.log(`✅ Successfully migrated: ${migrated}`);
		console.log(`❌ Errors: ${errors}`);

		return errors === 0;
	} catch (error) {
		console.error("❌ Migration failed:", error.message);
		return false;
	}
}

async function verifyMigration() {
	console.log("🔍 Verifying migration...");

	try {
		// Check how many users have hashed API keys
		const { rows: hashedCount } = await db.query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE api_key_hash IS NOT NULL
        `);

		// Check how many users still have plain API keys
		const { rows: plainCount } = await db.query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE api_key IS NOT NULL AND api_key != ''
        `);

		console.log(`✅ Users with hashed API keys: ${hashedCount[0].count}`);
		console.log(`⚠️  Users with plain API keys: ${plainCount[0].count}`);

		if (plainCount[0].count > 0) {
			console.log(
				"⚠️  Some users still have plain API keys. Consider removing them."
			);
		}

		return true;
	} catch (error) {
		console.error("❌ Verification failed:", error.message);
		return false;
	}
}

async function cleanupOldApiKeys() {
	console.log("🧹 Cleaning up old API keys...");

	try {
		// Check if there are any users with both plain and hashed API keys
		const { rows: duplicateCheck } = await db.query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE api_key IS NOT NULL AND api_key_hash IS NOT NULL
        `);

		if (duplicateCheck[0].count > 0) {
			console.log(
				`⚠️  Found ${duplicateCheck[0].count} users with both plain and hashed API keys`
			);

			// Ask user if they want to remove plain API keys
			console.log(
				"⚠️  WARNING: This will permanently remove plain API keys from the database."
			);
			console.log(
				"⚠️  Make sure all API keys have been properly migrated before proceeding."
			);
			console.log(
				"⚠️  To proceed, run: node scripts/migrate-api-keys.js --cleanup"
			);

			return false;
		}

		// Remove the old api_key column
		await db.query("ALTER TABLE users DROP COLUMN IF EXISTS api_key");
		console.log("✅ Removed old api_key column");

		return true;
	} catch (error) {
		console.error("❌ Cleanup failed:", error.message);
		return false;
	}
}

async function main() {
	console.log("🔑 Velaxios API Key Migration Tool");
	console.log("===================================\n");

	const args = process.argv.slice(2);
	const isCleanup = args.includes("--cleanup");

	try {
		// Test database connection
		await db.query("SELECT 1");
		console.log("✅ Database connection successful\n");

		// Check current state
		const apiKeyCount = await checkCurrentState();
		if (apiKeyCount === false) {
			console.log("❌ Cannot proceed with migration");
			return;
		}

		if (apiKeyCount === 0) {
			console.log("✅ No API keys to migrate");

			if (isCleanup) {
				await cleanupOldApiKeys();
			}

			return;
		}

		// Migrate API keys
		const migrationSuccess = await migrateApiKeys();
		if (!migrationSuccess) {
			console.log("❌ Migration failed");
			return;
		}

		// Verify migration
		await verifyMigration();

		// Cleanup if requested
		if (isCleanup) {
			await cleanupOldApiKeys();
		}

		console.log("\n🎉 API key migration completed successfully!");
		console.log("\nNext steps:");
		console.log("1. Test API key authentication");
		console.log("2. Monitor for any authentication issues");
		console.log(
			"3. Consider running cleanup: node scripts/migrate-api-keys.js --cleanup"
		);
	} catch (error) {
		console.error("\n❌ Migration failed:", error.message);
		process.exit(1);
	} finally {
		await db.pool.end();
	}
}

// Run migration if this script is executed directly
if (require.main === module) {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}

module.exports = {
	checkCurrentState,
	migrateApiKeys,
	verifyMigration,
	cleanupOldApiKeys,
};
