/**
 * Test creating shipment from order
 */

const axios = require("axios");

const ORDER_ID = "693483f6bd9e0c0980f8f22a"; // Your order ID
const API_URL = "http://localhost:5055";

async function testCreateShipment() {
  console.log("\n🚢 Testing Create Shipment from Order\n");
  console.log("Order ID:", ORDER_ID);
  console.log("=".repeat(60) + "\n");

  try {
    const response = await axios.post(
      `${API_URL}/api/shipping/orders/${ORDER_ID}/shipment`,
      {},
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      }
    );

    console.log("✅ SUCCESS! Shipment created\n");
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.shipment) {
      console.log("\n📦 Shipment Details:");
      console.log("  Shipment ID:", response.data.shipment.shipmentId);
      console.log(
        "  Tracking Number:",
        response.data.shipment.trackingId || "Pending"
      );
      console.log(
        "  Tracking URL:",
        response.data.shipment.trackingUrl || "Pending"
      );
      console.log("  Status:", response.data.shipment.status);
      console.log(
        "  Cost:",
        response.data.shipment.currency,
        response.data.shipment.cost
      );
    }
  } catch (error) {
    console.log("❌ FAILED!\n");

    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Error:", JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log("No response from server. Is the API running on port 5055?");
    } else {
      console.log("Error:", error.message);
    }
    process.exit(1);
  }
}

async function testGetTracking() {
  console.log("\n\n📍 Testing Get Tracking\n");
  console.log("=".repeat(60) + "\n");

  try {
    const response = await axios.get(
      `${API_URL}/api/shipping/orders/${ORDER_ID}/tracking`,
      { timeout: 30000 }
    );

    console.log("✅ SUCCESS! Tracking retrieved\n");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log("❌ FAILED!\n");

    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Error:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.log("Error:", error.message);
    }
  }
}

async function run() {
  await testCreateShipment();
  console.log("\n" + "=".repeat(60));
  console.log("Waiting 2 seconds before fetching tracking...");
  console.log("=".repeat(60));
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await testGetTracking();
}

run();
