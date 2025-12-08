const stallionService = require("../services/stallionService");
const Order = require("../models/Order");

/**
 * Get shipping rates from Stallion Express
 * POST /api/shipping/rates
 * Body: { origin, destination, parcels, serviceType? }
 */
const getShippingRates = async (req, res) => {
  try {
    const { origin, destination, parcels, serviceType } = req.body;

    // Dev debug: log incoming request body and masked headers
    if (process.env.NODE_ENV !== "production") {
      try {
        const maskedHeaders = {
          authorization: req.headers.authorization
            ? `Bearer *****${String(req.headers.authorization).slice(-4)}`
            : "(none)",
          "x-api-key": req.headers["x-api-key"]
            ? `*****${String(req.headers["x-api-key"]).slice(-4)}`
            : "(none)",
        };
        console.log("[ShipmentController] /rates called. body:", {
          originProvided: Boolean(origin),
          destinationProvided: Boolean(destination),
          parcelsCount: Array.isArray(parcels) ? parcels.length : 0,
          serviceType,
        });
        console.log(
          "[ShipmentController] request headers (masked):",
          maskedHeaders
        );
      } catch (e) {
        console.warn(
          "[ShipmentController] failed to log debug info",
          e.message
        );
      }
    }

    // Validate required fields
    if (!destination || !parcels || parcels.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Destination address and parcels are required",
      });
    }

    // Build warehouse origin from env (required by Stallion)
    const warehouseOrigin = origin || {
      name: process.env.WAREHOUSE_NAME || "Store Warehouse",
      address1: process.env.WAREHOUSE_ADDRESS_LINE1 || "123 Store St",
      city: process.env.WAREHOUSE_CITY || "Toronto",
      province: process.env.WAREHOUSE_STATE || "ON",
      postalCode: process.env.WAREHOUSE_POSTAL_CODE || "M5V2T6",
      country: process.env.WAREHOUSE_COUNTRY || "CA",
      phone: process.env.WAREHOUSE_PHONE || "4161234567",
      email: process.env.WAREHOUSE_EMAIL || "store@example.com",
    };

    // Ensure destination has proper province (not just country)
    const normalizedDestination = {
      ...destination,
      province: destination.province || destination.state || "ON",
    };

    // Build Stallion-compatible rate request payload
    const ratePayload = {
      from_address: {
        name: warehouseOrigin.name,
        street1: warehouseOrigin.address1,
        city: warehouseOrigin.city,
        province_code: warehouseOrigin.province || warehouseOrigin.state,
        postal_code: (warehouseOrigin.postalCode || "").replace(/\s/g, ""),
        country_code: warehouseOrigin.country,
        phone: warehouseOrigin.phone || "",
        email: warehouseOrigin.email || "",
      },
      to_address: {
        name: normalizedDestination.name || "Customer",
        street1: normalizedDestination.address1,
        city: normalizedDestination.city,
        province_code:
          normalizedDestination.province || normalizedDestination.state || "",
        postal_code: (normalizedDestination.postalCode || "").replace(
          /\s/g,
          ""
        ),
        country_code: normalizedDestination.country,
      },
      weight: parcels.reduce(
        (sum, p) => sum + (Number(p.weight) || 0.5) * (Number(p.quantity) || 1),
        0
      ),
      weight_unit: "kg",
      length: Math.max(...parcels.map((p) => Number(p.length) || 10)),
      width: Math.max(...parcels.map((p) => Number(p.width) || 10)),
      height: Math.max(...parcels.map((p) => Number(p.height) || 5)),
      size_unit: "cm",
      package_contents: "merchandise",
      value: 100,
      currency: "CAD",
    };

    if (serviceType) {
      ratePayload.service_code = serviceType;
    }

    const result = await stallionService.getRates(ratePayload);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        details: result.details,
      });
    }

    res.status(200).json({
      success: true,
      rates: result.rates,
    });
  } catch (error) {
    console.error("[Shipment Controller] Get rates error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get shipping rates",
    });
  }
};

/**
 * Create a shipment with Stallion Express
 * POST /api/shipping/create
 * Body: { orderId, service, origin?, destination, parcels, ... }
 */
const createShipmentHandler = async (req, res) => {
  try {
    const { orderId, service, origin, destination, parcels, reference } =
      req.body;

    // Validate required fields
    if (!orderId || !service || !destination || !parcels) {
      return res.status(400).json({
        success: false,
        message: "Order ID, service, destination, and parcels are required",
      });
    }

    // Check if order exists and doesn't already have a shipment
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Prevent duplicate shipment creation unless forced
    if (order.shipment && order.shipment.shipmentId && !req.body.forceRetry) {
      return res.status(400).json({
        success: false,
        message: "Shipment already exists for this order",
        shipment: order.shipment,
      });
    }

    // Use warehouse address from env for origin
    const warehouseOrigin = origin || {
      name: process.env.WAREHOUSE_NAME || "Store Warehouse",
      address1: process.env.WAREHOUSE_ADDRESS_LINE1 || "PLACEHOLDER_ADDRESS",
      city: process.env.WAREHOUSE_CITY || "PLACEHOLDER_CITY",
      province: process.env.WAREHOUSE_STATE || "PLACEHOLDER_STATE",
      postalCode: process.env.WAREHOUSE_POSTAL_CODE || "PLACEHOLDER_POSTAL",
      country: process.env.WAREHOUSE_COUNTRY || "CA",
      phone: process.env.WAREHOUSE_PHONE || "1234567890",
      email: process.env.WAREHOUSE_EMAIL || "store@example.com",
    };

    const shipmentPayload = {
      origin: warehouseOrigin,
      destination,
      parcels: parcels.map((p) => ({
        weight: p.weight || 0.5,
        length: p.length || 10,
        width: p.width || 10,
        height: p.height || 5,
        quantity: p.quantity || 1,
      })),
      service: service,
      reference: reference || `Order-${orderId}`,
      payer: "sender", // or allow this to be configurable
    };

    const result = await stallionService.createShipment(shipmentPayload);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        details: result.details,
      });
    }

    // Update order with shipment information
    order.shipment = {
      provider: "Stallion Express",
      service: service,
      shipmentId: result.shipment.id || result.shipment.shipment_id,
      trackingId:
        result.shipment.tracking_number || result.shipment.trackingNumber,
      trackingUrl: result.shipment.tracking_url || result.shipment.trackingUrl,
      labelUrl: result.shipment.label_url || result.shipment.labelUrl,
      status: result.shipment.status || "created",
      cost: result.shipment.cost || result.shipment.price || 0,
      currency: result.shipment.currency || "CAD",
      createdAt: new Date(),
      rawResponse: result.shipment,
    };

    await order.save();

    res.status(201).json({
      success: true,
      message: "Shipment created successfully",
      shipment: order.shipment,
    });
  } catch (error) {
    console.error("[Shipment Controller] Create shipment error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create shipment",
    });
  }
};

/**
 * Track a shipment
 * GET /api/shipping/track/:trackingId
 */
const trackShipment = async (req, res) => {
  try {
    const { trackingId } = req.params;

    if (!trackingId) {
      return res.status(400).json({
        success: false,
        message: "Tracking ID is required",
      });
    }

    const result = await stallionService.trackShipment(trackingId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        details: result.details,
      });
    }

    res.status(200).json({
      success: true,
      tracking: result.tracking,
    });
  } catch (error) {
    console.error("[Shipment Controller] Track shipment error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to track shipment",
    });
  }
};

/**
 * Cancel a shipment
 * DELETE /api/shipping/cancel/:orderId
 */
const cancelShipment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!order.shipment || !order.shipment.shipmentId) {
      return res.status(400).json({
        success: false,
        message: "No shipment found for this order",
      });
    }

    const result = await stallionService.cancelShipment(
      order.shipment.shipmentId
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    // Update order shipment status
    order.shipment.status = "cancelled";
    order.shipment.cancelledAt = new Date();
    await order.save();

    res.status(200).json({
      success: true,
      message: "Shipment cancelled successfully",
    });
  } catch (error) {
    console.error("[Shipment Controller] Cancel shipment error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel shipment",
    });
  }
};

/**
 * Handle webhook from Stallion Express
 * POST /api/shipping/webhook
 */
const handleWebhook = async (req, res) => {
  try {
    const signature =
      req.headers["x-stallion-signature"] || req.headers["stallion-signature"];
    const rawBody = JSON.stringify(req.body);

    // Verify webhook signature if available
    const isValid = stallionService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    const { event, data } = req.body;

    console.log("[Stallion Webhook] Received event:", event, data);

    // Handle different webhook events
    switch (event) {
      case "shipment.created":
      case "shipment.updated":
      case "shipment.in_transit":
      case "shipment.delivered":
      case "shipment.failed":
        await handleShipmentStatusUpdate(data);
        break;
      default:
        console.log("[Stallion Webhook] Unhandled event type:", event);
    }

    res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error("[Shipment Controller] Webhook error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Webhook processing failed",
    });
  }
};

/**
 * Helper: Update order shipment status from webhook
 */
const handleShipmentStatusUpdate = async (data) => {
  try {
    const trackingNumber = data.tracking_number || data.trackingNumber;
    const shipmentId = data.id || data.shipment_id;
    const status = data.status;

    // Find order by tracking number or shipment ID
    const order = await Order.findOne({
      $or: [
        { "shipment.trackingId": trackingNumber },
        { "shipment.shipmentId": shipmentId },
      ],
    });

    if (!order) {
      console.warn("[Webhook] Order not found for shipment:", shipmentId);
      return;
    }

    // Update shipment status
    order.shipment.status = status;
    order.shipment.lastUpdated = new Date();

    // Update order status based on shipment status
    if (status === "delivered") {
      order.status = "Delivered";
    } else if (status === "in_transit") {
      order.status = "Shipped";
    }

    await order.save();

    console.log(
      `[Webhook] Updated order ${order._id} shipment status to: ${status}`
    );

    // TODO: Send email notification to customer about status change
    // const emailSender = require("../lib/email-sender/email.sender");
    // await emailSender.sendShipmentStatusEmail(order);
  } catch (error) {
    console.error("[Webhook] Error updating order:", error);
  }
};

/**
 * Create shipment from order ID
 * POST /api/shipping/orders/:orderId/shipment
 */
const createShipmentFromOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Fetch order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if shipment already exists
    if (order.shipment && order.shipment.shipmentId && !req.body.forceRetry) {
      return res.status(400).json({
        success: false,
        message: "Shipment already exists for this order",
        shipment: order.shipment,
      });
    }

    // Build warehouse origin from env
    const warehouseOrigin = {
      name: (process.env.WAREHOUSE_NAME || "Store Warehouse").substring(0, 40),
      company: null,
      address1: (
        process.env.WAREHOUSE_ADDRESS_LINE1 || "123 Store St"
      ).substring(0, 50),
      address2: null,
      city: (process.env.WAREHOUSE_CITY || "Toronto").substring(0, 35),
      province_code: (process.env.WAREHOUSE_STATE || "ON").substring(0, 2),
      postal_code: (process.env.WAREHOUSE_POSTAL_CODE || "M5V2T6")
        .replace(/\s/g, "")
        .substring(0, 10),
      country_code: (process.env.WAREHOUSE_COUNTRY || "CA").substring(0, 2),
      phone: process.env.WAREHOUSE_PHONE || "4161234567",
      email: process.env.WAREHOUSE_EMAIL || "store@example.com",
    };

    // Build destination from order
    const destination = {
      name: (order.user_info?.name || "Customer").substring(0, 40),
      company: null,
      address1: (order.user_info?.address || "Unknown Address").substring(
        0,
        50
      ),
      address2: null,
      city: (order.user_info?.city || "Unknown").substring(0, 35),
      province_code: (
        order.user_info?.state ||
        order.user_info?.province ||
        "ON"
      ).substring(0, 2),
      postal_code: (order.user_info?.zipCode || "")
        .replace(/\s/g, "")
        .substring(0, 10),
      country_code: (order.user_info?.country || "CA").substring(0, 2),
      phone: order.user_info?.contact || "",
      email: order.user_info?.email || "",
    };

    // Calculate total weight from cart
    const totalWeight =
      order.cart?.reduce((sum, item) => {
        const itemWeight =
          item.variant?.weight ||
          item.weight ||
          parseFloat(process.env.DEFAULT_PRODUCT_WEIGHT) ||
          0.5;
        return sum + itemWeight * (item.quantity || 1);
      }, 0) || 0.5;

    // Build Stallion payload with ALL required fields
    const shipmentPayload = {
      to_address: destination,
      order_id: `ORDER-${order.invoice || order._id}`,
      weight: totalWeight,
      weight_unit: process.env.DEFAULT_WEIGHT_UNIT || "kg",
      length: parseFloat(process.env.DEFAULT_PRODUCT_LENGTH) || 10,
      width: parseFloat(process.env.DEFAULT_PRODUCT_WIDTH) || 10,
      height: parseFloat(process.env.DEFAULT_PRODUCT_HEIGHT) || 5,
      size_unit: process.env.DEFAULT_DIM_UNIT || "cm",
      package_contents: "merchandise",
      value: order.total || order.subTotal || 100,
      currency: "CAD",
      package_type: "Parcel",
      postage_type: "Canada Post Regular", // Domestic Canadian shipping
      signature_confirmation: false,
      insured: false,
      label_format: "pdf",
    };

    console.log(
      "[Shipment] Creating shipment with payload:",
      JSON.stringify(shipmentPayload, null, 2)
    );

    // Create shipment via Stallion
    const result = await stallionService.createShipment(shipmentPayload);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || "Failed to create shipment",
        details: result.details,
      });
    }

    // Save shipment data to order
    const shipmentData = result.shipment;
    order.shipment = order.shipment || {};
    order.shipment.provider = "Stallion Express";
    order.shipment.shipmentId = shipmentData.id || shipmentData.shipment_id;
    order.shipment.trackingId =
      shipmentData.tracking_number || shipmentData.tracking?.number;
    order.shipment.trackingUrl =
      shipmentData.tracking_url || shipmentData.tracking?.url;
    order.shipment.labelUrl =
      shipmentData.label_url || shipmentData.labels?.[0]?.url;
    order.shipment.status = shipmentData.status || "created";
    order.shipment.cost =
      shipmentData.total || shipmentData.amount || order.shippingCost;
    order.shipment.currency = shipmentData.currency || "CAD";
    order.shipment.createdAt = new Date();
    order.shipment.lastUpdated = new Date();
    order.shipment.rawResponse = shipmentData;

    await order.save();

    res.status(200).json({
      success: true,
      message: "Shipment created successfully",
      shipment: order.shipment,
      order: {
        id: order._id,
        invoice: order.invoice,
        status: order.status,
      },
    });
  } catch (error) {
    console.error(
      "[Shipment Controller] Create shipment from order error:",
      error
    );
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create shipment",
      error: error.toString(),
    });
  }
};

/**
 * Get shipment tracking for order
 * GET /api/shipping/orders/:orderId/tracking
 */
const getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!order.shipment || !order.shipment.shipmentId) {
      return res.status(404).json({
        success: false,
        message: "No shipment found for this order",
      });
    }

    // Fetch latest tracking from Stallion
    const result = await stallionService.trackShipment(
      order.shipment.shipmentId
    );

    if (!result.success) {
      // Return saved tracking info if API fails
      return res.status(200).json({
        success: true,
        tracking: order.shipment,
        source: "cached",
      });
    }

    // Update order with latest tracking
    const trackingData = result.tracking;
    order.shipment.trackingId =
      trackingData.tracking_number || order.shipment.trackingId;
    order.shipment.trackingUrl =
      trackingData.tracking_url || order.shipment.trackingUrl;
    order.shipment.status = trackingData.status || order.shipment.status;
    order.shipment.lastUpdated = new Date();
    order.shipment.rawResponse = trackingData;

    await order.save();

    res.status(200).json({
      success: true,
      tracking: {
        shipmentId: order.shipment.shipmentId,
        trackingNumber: order.shipment.trackingId,
        trackingUrl: order.shipment.trackingUrl,
        status: order.shipment.status,
        provider: order.shipment.provider,
        lastUpdated: order.shipment.lastUpdated,
        events: trackingData.events || [],
      },
      source: "live",
    });
  } catch (error) {
    console.error("[Shipment Controller] Get order tracking error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get tracking information",
    });
  }
};

/**
 * Get postage types
 * GET /api/shipping/postage-types
 */
const getPostageTypes = async (req, res) => {
  try {
    const result = await stallionService.getPostageTypes();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.status(200).json({
      success: true,
      postageTypes: result.data,
    });
  } catch (error) {
    console.error("[Shipment Controller] Get postage types error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get postage types",
    });
  }
};

module.exports = {
  getShippingRates,
  createShipmentHandler,
  createShipmentFromOrder,
  getOrderTracking,
  trackShipment,
  cancelShipment,
  handleWebhook,
  getPostageTypes,
};
