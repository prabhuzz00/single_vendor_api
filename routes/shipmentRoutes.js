const express = require("express");
const router = express.Router();
const shipmentController = require("../controller/shipmentController");

/**
 * Shipping Routes for Stallion Express Integration
 * Base path: /api/shipping
 */

// Get available postage types
router.get("/postage-types", shipmentController.getPostageTypes);

// Get shipping rates for checkout
router.post("/rates", shipmentController.getShippingRates);

// Create a shipment (after order is placed)
router.post("/create", shipmentController.createShipmentHandler);

// Create shipment from existing order ID
router.post(
  "/orders/:orderId/shipment",
  shipmentController.createShipmentFromOrder
);

// Get tracking for an order
router.get("/orders/:orderId/tracking", shipmentController.getOrderTracking);

// Track a shipment by tracking ID
router.get("/track/:trackingId", shipmentController.trackShipment);

// Cancel a shipment by order ID
router.delete("/cancel/:orderId", shipmentController.cancelShipment);

// Webhook endpoint for Stallion status updates
router.post("/webhook", shipmentController.handleWebhook);

// Development helper: return masked Stallion config so dev can verify env
router.get("/debug", (req, res) => {
  try {
    const isDev = process.env.NODE_ENV !== "production";
    const baseURL = isDev
      ? process.env.STALLION_BASE_URL_SANDBOX
      : process.env.STALLION_BASE_URL_PROD;
    const apiKey = isDev
      ? process.env.STALLION_API_KEY_SANDBOX
      : process.env.STALLION_API_KEY_PROD;

    return res.json({
      success: true,
      env: { NODE_ENV: process.env.NODE_ENV || null },
      stallion: {
        baseURL: baseURL || null,
        apiKeyMasked: apiKey ? `*****${String(apiKey).slice(-4)}` : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
