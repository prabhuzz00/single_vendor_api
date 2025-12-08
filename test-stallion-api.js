/**
 * Stallion API Key Test Script
 * Run this after updating your API key to verify it works
 */

require("dotenv").config();
const axios = require("axios");

const isDevelopment = process.env.NODE_ENV !== "production";
const baseURL = isDevelopment
  ? process.env.STALLION_BASE_URL_SANDBOX
  : process.env.STALLION_BASE_URL_PROD;
const apiKey = isDevelopment
  ? process.env.STALLION_API_KEY_SANDBOX
  : process.env.STALLION_API_KEY_PROD;

console.log("\n🔍 Testing Stallion Express API Configuration\n");
console.log("Environment:", process.env.NODE_ENV || "development");
console.log("Base URL:", baseURL);
console.log(
  "API Key (masked):",
  apiKey ? `...${apiKey.slice(-4)}` : "❌ NOT SET"
);
console.log("\n" + "=".repeat(60) + "\n");

async function testAPI() {
  if (!apiKey) {
    console.error("❌ ERROR: API key not configured!");
    console.log("\nPlease set STALLION_API_KEY_SANDBOX in your .env file");
    console.log(
      "Get your API key from: https://ship.stallionexpress.ca/account-settings\n"
    );
    process.exit(1);
  }

  try {
    console.log("📡 Testing connection to Stallion API...\n");

    const response = await axios.get(`${baseURL}postage-types`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    console.log("✅ SUCCESS! API key is valid\n");
    console.log("Available postage types:", response.data?.length || "unknown");

    if (response.data && Array.isArray(response.data)) {
      console.log("\nServices available:");
      response.data.slice(0, 5).forEach((service, i) => {
        console.log(
          `  ${i + 1}. ${service.name || service.service || "Unknown"}`
        );
      });
      if (response.data.length > 5) {
        console.log(`  ... and ${response.data.length - 5} more`);
      }
    }

    console.log("\n✅ Your Stallion integration is configured correctly!");
    console.log("You can now use the shipping features in your application.\n");
  } catch (error) {
    console.log("❌ FAILED! API request failed\n");

    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Error:", error.response.statusText);
      console.log("Details:", JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 401 || error.response.status === 403) {
        console.log("\n⚠️  AUTHENTICATION ERROR");
        console.log("Your API key is invalid or expired.");
        console.log("\nTo fix this:");
        console.log("1. Login to: https://ship.stallionexpress.ca/login");
        console.log("2. Go to Account Settings → API Token");
        console.log("3. Copy your API key");
        console.log("4. Update STALLION_API_KEY_SANDBOX in .env file");
        console.log("5. Run this test again\n");
      }
    } else if (error.request) {
      console.log("No response received from Stallion API");
      console.log("Possible causes:");
      console.log("  - Network connection issue");
      console.log("  - Firewall blocking requests");
      console.log("  - Wrong base URL\n");
    } else {
      console.log("Error:", error.message);
    }

    process.exit(1);
  }
}

testAPI();
