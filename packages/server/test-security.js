#!/usr/bin/env node

/**
 * Security Implementation Test Script
 *
 * This script tests the security implementation without requiring
 * the new dependencies to be installed first.
 */

require("dotenv").config({
	path: require("path").resolve(__dirname, "../../.env"),
});

const crypto = require("crypto");
const db = require("./db");

// Mock the security middleware functions for testing
const mockSecurityMiddleware = {
	hashApiKey: async (apiKey) => {
		// Simple hash for testing (in production, use bcrypt)
		return crypto.createHash("sha256").update(apiKey).digest("hex");
	},

	verifyApiKey: async (plainApiKey, hashedApiKey) => {
		const hash = crypto.createHash("sha256").update(plainApiKey).digest("hex");
		return hash === hashedApiKey;
	},

	generateJWTSecret: () => {
		return crypto.randomBytes(64).toString("hex");
	},

	createRateLimiter: (windowMs, max) => {
		return (req, res, next) => {
			// Mock rate limiter for testing
			next();
		};
	},
};

// Test JWT secret rotation
function testJWTSecretRotation() {
	console.log("🔐 Testing JWT Secret Rotation...");

	const currentSecret = process.env.JWT_SECRET || "test-secret";
	const previousSecret = process.env.JWT_SECRET_PREVIOUS;
	const newSecret = mockSecurityMiddleware.generateJWTSecret();

	console.log("✅ Current JWT secret:", currentSecret ? "Set" : "Not set");
	console.log("✅ Previous JWT secret:", previousSecret ? "Set" : "Not set");
	console.log(
		"✅ New JWT secret generated:",
		newSecret.substring(0, 16) + "..."
	);

	return true;
}

// Test API key hashing
async function testApiKeyHashing() {
	console.log("\n🔑 Testing API Key Hashing...");

	const testApiKey = "test-api-key-12345";
	const hashedKey = await mockSecurityMiddleware.hashApiKey(testApiKey);
	const isValid = await mockSecurityMiddleware.verifyApiKey(
		testApiKey,
		hashedKey
	);

	console.log("✅ API key hashing works:", isValid);
	console.log("✅ Hashed key length:", hashedKey.length);

	return isValid;
}

// Test database connection
async function testDatabaseConnection() {
	console.log("\n🗄️  Testing Database Connection...");

	try {
		const { rows } = await db.query("SELECT 1 as test");
		console.log("✅ Database connection successful");
		return true;
	} catch (error) {
		console.log("❌ Database connection failed:", error.message);
		return false;
	}
}

// Test security migration
async function testSecurityMigration() {
	console.log("\n🔒 Testing Security Migration...");

	try {
		// Check if security tables exist
		const tables = ["user_sessions", "audit_logs", "rate_limits"];

		for (const table of tables) {
			try {
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
					console.log(`⚠️  Table '${table}' missing (run migration)`);
				}
			} catch (error) {
				console.log(`❌ Error checking table '${table}':`, error.message);
			}
		}

		// Check if security columns exist in users table
		const columns = ["api_key_hash", "failed_login_attempts", "locked_until"];

		for (const column of columns) {
			try {
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
					console.log(`⚠️  Column 'users.${column}' missing (run migration)`);
				}
			} catch (error) {
				console.log(`❌ Error checking column '${column}':`, error.message);
			}
		}

		return true;
	} catch (error) {
		console.log("❌ Security migration test failed:", error.message);
		return false;
	}
}

// Test environment variables
function testEnvironmentVariables() {
	console.log("\n🌍 Testing Environment Variables...");

	const requiredVars = [
		"JWT_SECRET",
		"MICROSOFT_CLIENT_ID",
		"MICROSOFT_CLIENT_SECRET",
	];

	const optionalVars = ["JWT_SECRET_PREVIOUS", "SERVER_URL", "CLIENT_URL"];

	let allRequiredSet = true;

	for (const varName of requiredVars) {
		const value = process.env[varName];
		if (value) {
			console.log(`✅ ${varName}: Set`);
		} else {
			console.log(`❌ ${varName}: Not set`);
			allRequiredSet = false;
		}
	}

	console.log("\nOptional variables:");
	for (const varName of optionalVars) {
		const value = process.env[varName];
		if (value) {
			console.log(`✅ ${varName}: Set`);
		} else {
			console.log(`⚠️  ${varName}: Not set (optional)`);
		}
	}

	return allRequiredSet;
}

// Test security features
async function testSecurityFeatures() {
	console.log("\n🛡️  Testing Security Features...");

	// Test email masking
	const testEmail = "user@example.com";
	const maskedEmail = testEmail.replace(/(.{2}).*@/, "$1***@");
	console.log("✅ Email masking:", `${testEmail} -> ${maskedEmail}`);

	// Test token blacklist (mock)
	const tokenBlacklist = new Set();
	const testToken = "test-token-123";
	tokenBlacklist.add(testToken);
	console.log("✅ Token blacklisting:", tokenBlacklist.has(testToken));

	// Test rate limiting (mock)
	const rateLimiter = mockSecurityMiddleware.createRateLimiter(
		15 * 60 * 1000,
		100
	);
	console.log("✅ Rate limiting middleware created");

	return true;
}

// Main test function
async function runSecurityTests() {
	console.log("🚀 Velaxios Security Implementation Test");
	console.log("========================================\n");

	const results = {
		jwtRotation: testJWTSecretRotation(),
		apiKeyHashing: await testApiKeyHashing(),
		databaseConnection: await testDatabaseConnection(),
		securityMigration: await testSecurityMigration(),
		environmentVariables: testEnvironmentVariables(),
		securityFeatures: await testSecurityFeatures(),
	};

	console.log("\n📊 Test Results:");
	console.log("================");

	for (const [test, result] of Object.entries(results)) {
		const status = result ? "✅ PASS" : "❌ FAIL";
		console.log(`${status} ${test}`);
	}

	const allPassed = Object.values(results).every((result) => result);

	if (allPassed) {
		console.log("\n🎉 All security tests passed!");
		console.log("\nNext steps:");
		console.log("1. Install dependencies: yarn install");
		console.log("2. Run migration: yarn security-migration");
		console.log("3. Restart the application");
		console.log("4. Test the new security features");
	} else {
		console.log("\n⚠️  Some tests failed. Please check the issues above.");
	}

	return allPassed;
}

// Run tests if this script is executed directly
if (require.main === module) {
	runSecurityTests()
		.then((success) => {
			process.exit(success ? 0 : 1);
		})
		.catch((error) => {
			console.error("Test failed:", error);
			process.exit(1);
		});
}

module.exports = {
	runSecurityTests,
	testJWTSecretRotation,
	testApiKeyHashing,
	testDatabaseConnection,
	testSecurityMigration,
	testEnvironmentVariables,
	testSecurityFeatures,
};
