/**
 * Test shipping rates endpoint
 */

require("dotenv").config();
const axios = require("axios");

const testData = {
  destination: {
    name: "Test Customer",
    address1: "456 Customer St",
    city: "Chennai",
    province: "",
    state: "",
    postalCode: "600001",
    country: "IN",
  },
  parcels: [
    {
      weight: 0.5,
      length: 10,
      width: 10,
      height: 5,
      quantity: 1,
      weightUnit: "kg",
      dimensionUnit: "cm",
    },
  ],
};

async function testRates() {
  console.log("\n🚢 Testing Shipping Rates API\n");
  console.log(
    "Destination:",
    testData.destination.city,
    testData.destination.country
  );
  console.log("Parcel:", testData.parcels[0]);
  console.log("\n" + "=".repeat(60) + "\n");

  try {
    const response = await axios.post(
      "http://localhost:5055/api/shipping/rates",
      testData,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    console.log("✅ SUCCESS! Shipping rates retrieved\n");
    console.log("Response:", JSON.stringify(response.data, null, 2));

    if (response.data.rates && response.data.rates.length > 0) {
      console.log("\n📦 Available shipping options:");
      response.data.rates.forEach((rate, i) => {
        console.log(
          `  ${i + 1}. ${rate.service || rate.name} - $${
            rate.cost || rate.price
          }`
        );
      });
    }
  } catch (error) {
    console.log("❌ FAILED!\n");

    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Error:", error.response.data);
    } else if (error.request) {
      console.log("No response from server. Is the API running on port 5055?");
    } else {
      console.log("Error:", error.message);
    }
    process.exit(1);
  }
}

testRates();
