// Simple test to verify Heroku deployment setup
console.log("Testing Heroku deployment setup...");
console.log("Node version:", process.version);
console.log("Current directory:", __dirname);
console.log("Environment variables:");
console.log("- PORT:", process.env.PORT || "Not set (defaulting to 3001)");
console.log("- NODE_ENV:", process.env.NODE_ENV || "Not set (defaulting to development)");

// Try to import a simple module
try {
  const _express = require("express");
  console.log("✓ Express imported successfully");
} catch (error) {
  console.error("✗ Failed to import Express:", error.message);
}

// Try to import our main module
try {
  const _app = require("./dist/index.js");
  console.log("✓ Main application imported successfully");
} catch (error) {
  console.error("✗ Failed to import main application:", error.message);
}

console.log("Heroku deployment setup test completed.");