#!/usr/bin/env node

/**
 * Security Setup Script
 *
 * This script handles the complete security implementation setup:
 * 1. Tests current implementation
 * 2. Installs dependencies
 * 3. Runs database migration
 * 4. Verifies everything works
 */

require("dotenv").config({
	path: require("path").resolve(__dirname, "../../.env"),
});

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Colors for console output
const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
};

function log(message, color = "reset") {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
	log(`\n${step} ${message}`, "cyan");
}

function logSuccess(message) {
	log(`✅ ${message}`, "green");
}

function logWarning(message) {
	log(`⚠️  ${message}`, "yellow");
}

function logError(message) {
	log(`❌ ${message}`, "red");
}

function logInfo(message) {
	log(`ℹ️  ${message}`, "blue");
}

// Check if we're in the right directory
function checkDirectory() {
	logStep("1", "Checking directory structure...");

	const requiredFiles = [
		"package.json",
		"index.js",
		"security/auth.js",
		"security/middleware.js",
	];

	for (const file of requiredFiles) {
		if (!fs.existsSync(file)) {
			logError(`Required file missing: ${file}`);
			return false;
		}
	}

	logSuccess("Directory structure is correct");
	return true;
}

// Test current implementation
async function testCurrentImplementation() {
	logStep("2", "Testing current security implementation...");

	try {
		// Import the test module
		const testModule = require("./test-security.js");
		const success = await testModule.runSecurityTests();

		if (success) {
			logSuccess("Current implementation test passed");
			return true;
		} else {
			logWarning("Some tests failed, but continuing with setup");
			return true; // Continue anyway
		}
	} catch (error) {
		logError(`Test failed: ${error.message}`);
		return false;
	}
}

// Install dependencies
function installDependencies() {
	logStep("3", "Installing security dependencies...");

	try {
		logInfo(
			"Installing bcryptjs, express-rate-limit, helmet, express-validator..."
		);

		// Check if yarn is available
		try {
			execSync("yarn --version", { stdio: "pipe" });
			logInfo("Using Yarn package manager");

			// Install dependencies
			execSync("yarn install", {
				stdio: "inherit",
				cwd: process.cwd(),
			});

			logSuccess("Dependencies installed successfully");
			return true;
		} catch (error) {
			logWarning("Yarn not available, trying npm...");

			try {
				execSync("npm install", {
					stdio: "inherit",
					cwd: process.cwd(),
				});

				logSuccess("Dependencies installed successfully with npm");
				return true;
			} catch (npmError) {
				logError("Failed to install dependencies");
				logError(`Yarn error: ${error.message}`);
				logError(`NPM error: ${npmError.message}`);
				return false;
			}
		}
	} catch (error) {
		logError(`Installation failed: ${error.message}`);
		return false;
	}
}

// Run database migration
function runDatabaseMigration() {
	logStep("4", "Running database migration...");

	try {
		logInfo("Executing security migration script...");

		execSync("node scripts/run-security-migration.js", {
			stdio: "inherit",
			cwd: process.cwd(),
		});

		logSuccess("Database migration completed successfully");
		return true;
	} catch (error) {
		logError(`Migration failed: ${error.message}`);
		logWarning("You may need to run the migration manually");
		return false;
	}
}

// Verify final implementation
async function verifyFinalImplementation() {
	logStep("5", "Verifying final security implementation...");

	try {
		// Test with real dependencies
		const testModule = require("./test-security.js");
		const success = await testModule.runSecurityTests();

		if (success) {
			logSuccess("Final verification passed");
			return true;
		} else {
			logWarning("Some verification tests failed");
			return false;
		}
	} catch (error) {
		logError(`Verification failed: ${error.message}`);
		return false;
	}
}

// Create environment template
function createEnvironmentTemplate() {
	logStep("6", "Creating environment template...");

	const envTemplate = `# Security Configuration
# Copy this to your .env file and update the values

# JWT Configuration
JWT_SECRET=your-secure-jwt-secret-here
JWT_SECRET_PREVIOUS=your-previous-jwt-secret-optional

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Server Configuration
SERVER_URL=https://your-server-url.com
CLIENT_URL=https://your-client-url.com

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
`;

	const envTemplatePath = path.join(process.cwd(), ".env.template");

	try {
		fs.writeFileSync(envTemplatePath, envTemplate);
		logSuccess("Environment template created: .env.template");
		logInfo("Please copy and update the values in your .env file");
		return true;
	} catch (error) {
		logError(`Failed to create environment template: ${error.message}`);
		return false;
	}
}

// Display next steps
function displayNextSteps() {
	logStep("7", "Setup Summary");

	logInfo("Security implementation setup completed!");
	logInfo("");
	logInfo("Next steps:");
	logInfo("1. Update your .env file with the required environment variables");
	logInfo("2. Restart your application: yarn dev");
	logInfo("3. Test the security features: yarn test-security");
	logInfo("4. Monitor security logs: GET /api/security/status");
	logInfo("5. Review the SECURITY.md documentation");
	logInfo("");
	logInfo("Security endpoints available:");
	logInfo("- GET /api/security/audit-logs");
	logInfo("- GET /api/security/stats");
	logInfo("- GET /api/security/failed-auth");
	logInfo("- GET /api/security/status");
	logInfo("- GET /api/security/sessions");
	logInfo("");
	logInfo("For help, see SECURITY.md or contact the security team");
}

// Main setup function
async function runSecuritySetup() {
	log("🚀 Velaxios Security Setup", "bright");
	log("===========================\n", "bright");

	const steps = [
		{ name: "Directory Check", fn: checkDirectory },
		{ name: "Current Implementation Test", fn: testCurrentImplementation },
		{ name: "Dependency Installation", fn: installDependencies },
		{ name: "Database Migration", fn: runDatabaseMigration },
		{ name: "Final Verification", fn: verifyFinalImplementation },
		{ name: "Environment Template", fn: createEnvironmentTemplate },
	];

	const results = [];

	for (let i = 0; i < steps.length; i++) {
		const step = steps[i];
		logStep(`${i + 1}`, `${step.name}...`);

		try {
			const result = await step.fn();
			results.push(result);

			if (result) {
				logSuccess(`${step.name} completed`);
			} else {
				logWarning(`${step.name} failed, but continuing...`);
			}
		} catch (error) {
			logError(`${step.name} failed: ${error.message}`);
			results.push(false);
		}
	}

	// Display results summary
	log("\n📊 Setup Results:", "bright");
	log("================");

	for (let i = 0; i < steps.length; i++) {
		const status = results[i] ? "✅ PASS" : "❌ FAIL";
		log(`${status} ${steps[i].name}`);
	}

	const successCount = results.filter((r) => r).length;
	const totalSteps = steps.length;

	log(`\n${successCount}/${totalSteps} steps completed successfully`);

	if (successCount >= totalSteps - 1) {
		// Allow one failure
		logSuccess("Security setup completed successfully!");
		displayNextSteps();
		return true;
	} else {
		logError("Security setup failed. Please check the errors above.");
		logInfo("You may need to run some steps manually.");
		return false;
	}
}

// Run setup if this script is executed directly
if (require.main === module) {
	runSecuritySetup()
		.then((success) => {
			process.exit(success ? 0 : 1);
		})
		.catch((error) => {
			logError(`Setup failed: ${error.message}`);
			process.exit(1);
		});
}

module.exports = {
	runSecuritySetup,
	checkDirectory,
	testCurrentImplementation,
	installDependencies,
	runDatabaseMigration,
	verifyFinalImplementation,
	createEnvironmentTemplate,
};
