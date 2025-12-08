const axios = require("axios");

/**
 * Stallion Express Shipping Integration Service
 *
 * Environment Variables Required:
 * - STALLION_BASE_URL_SANDBOX: https://sandbox.stallionexpress.ca/api/v4/
 * - STALLION_BASE_URL_PROD: https://ship.stallionexpress.ca/api/v4/
 * - STALLION_API_KEY_SANDBOX: Your sandbox API key
 * - STALLION_API_KEY_PROD: Your production API key
 * - NODE_ENV: development | production
 */

const isDevelopment = process.env.NODE_ENV !== "production";

const baseURL = isDevelopment
  ? process.env.STALLION_BASE_URL_SANDBOX ||
    "https://sandbox.stallionexpress.ca/api/v4/"
  : process.env.STALLION_BASE_URL_PROD ||
    "https://ship.stallionexpress.ca/api/v4/";

const apiKey = isDevelopment
  ? process.env.STALLION_API_KEY_SANDBOX
  : process.env.STALLION_API_KEY_PROD;

// Create axios client for Stallion API
const stallionClient = axios.create({
  baseURL: baseURL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Development debug: log whether API key is present (mask value)
if (isDevelopment) {
  const masked = apiKey ? `*****${String(apiKey).slice(-4)}` : "(none)";
  console.log(`[Stallion Service] baseURL=${baseURL} apiKey=${masked}`);
}

// Add request interceptor for logging in development
stallionClient.interceptors.request.use(
  (config) => {
    // Ensure API key header is attached at request time (so env changes apply)
    if (apiKey) {
      config.headers = config.headers || {};
      // Stallion uses Authorization Bearer header
      config.headers.Authorization = `Bearer ${apiKey}`;
    }

    if (isDevelopment) {
      // Mask header values when logging
      const auth = config.headers?.Authorization
        ? `Bearer *****${String(config.headers.Authorization).slice(-4)}`
        : "(none)";
      console.log(
        `[Stallion API] ${config.method.toUpperCase()} ${
          config.url
        } | Authorization=${auth}`
      );
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
stallionClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("[Stallion API Error]", {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
      console.error("[Stallion API] No response received:", error.message);
    } else {
      console.error("[Stallion API] Request setup error:", error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Get available postage types
 * @returns {Promise<Object>} List of available postage types
 */
const getPostageTypes = async () => {
  try {
    if (!apiKey) {
      return {
        success: false,
        error:
          "Stallion API key not configured. Please set STALLION_API_KEY_SANDBOX or STALLION_API_KEY_PROD in the server .env",
      };
    }
    const response = await stallionClient.get("/postage-types");
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const status = error.response?.status;
    const remote = error.response?.data;
    if (status === 401 || status === 403) {
      return {
        success: false,
        error:
          "Unauthenticated. Stallion rejected the request — check your STALLION_API_KEY and environment configuration.",
        details: remote,
      };
    }

    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: remote,
    };
  }
};

/**
 * Get shipping rates for a shipment
 * @param {Object} payload - Rate request payload
 * @param {Object} payload.origin - Origin address
 * @param {Object} payload.destination - Destination address
 * @param {Array} payload.parcels - Array of parcel details
 * @returns {Promise<Object>} Available shipping rates
 */
const getRates = async (payload) => {
  try {
    if (!apiKey) {
      return {
        success: false,
        error:
          "Stallion API key not configured. Please set STALLION_API_KEY_SANDBOX or STALLION_API_KEY_PROD in the server .env",
      };
    }

    // Log payload for debugging
    if (isDevelopment) {
      console.log(
        "[Stallion API] Sending rate request:",
        JSON.stringify(payload, null, 2)
      );
    }

    const response = await stallionClient.post("/rates", payload);
    return {
      success: true,
      rates: response.data,
    };
  } catch (error) {
    const status = error.response?.status;
    const remote = error.response?.data;

    console.error("[Stallion API] getRates failed:", {
      status,
      message: error.response?.data?.message || error.message,
      errors: error.response?.data?.errors,
      apiKeyPresent: Boolean(apiKey),
      apiKeyEnding: apiKey ? `...${String(apiKey).slice(-4)}` : "none",
    });

    if (status === 401 || status === 403) {
      return {
        success: false,
        error:
          "❌ Invalid Stallion API key. Please update STALLION_API_KEY_SANDBOX in .env file. Get your API key from: https://ship.stallionexpress.ca/account-settings",
        details: remote,
      };
    }

    if (status === 400) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          "Bad request - check address and package details",
        details: remote,
      };
    }

    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: remote,
    };
  }
};

/**
 * Create a shipment and get label
 * @param {Object} payload - Shipment creation payload
 * @returns {Promise<Object>} Created shipment details with tracking and label
 */
const createShipment = async (payload) => {
  try {
    if (!apiKey) {
      return {
        success: false,
        error:
          "Stallion API key not configured. Please set STALLION_API_KEY_SANDBOX or STALLION_API_KEY_PROD in the server .env",
      };
    }

    // Log payload for debugging
    if (isDevelopment) {
      console.log(
        "[Stallion API] Creating shipment with payload:",
        JSON.stringify(payload, null, 2)
      );
    }

    const response = await stallionClient.post("/shipments", payload);
    return {
      success: true,
      shipment: response.data,
    };
  } catch (error) {
    const status = error.response?.status;
    const remote = error.response?.data;

    console.error("[Stallion API] createShipment failed:", {
      status,
      message: error.response?.data?.message || error.message,
      errors: error.response?.data?.errors,
      apiKeyPresent: Boolean(apiKey),
    });

    if (status === 401 || status === 403) {
      return {
        success: false,
        error:
          "Unauthenticated. Stallion rejected the request — check your STALLION_API_KEY and environment configuration.",
        details: remote,
      };
    }

    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: remote,
    };
  }
};

/**
 * Track a shipment by tracking number or shipment ID
 * @param {string} trackingId - Tracking number or shipment ID
 * @returns {Promise<Object>} Tracking information
 */
const trackShipment = async (trackingId) => {
  try {
    if (!apiKey) {
      return {
        success: false,
        error:
          "Stallion API key not configured. Please set STALLION_API_KEY_SANDBOX or STALLION_API_KEY_PROD in the server .env",
      };
    }
    const response = await stallionClient.get(`/shipments/${trackingId}`);
    return {
      success: true,
      tracking: response.data,
    };
  } catch (error) {
    const status = error.response?.status;
    const remote = error.response?.data;
    if (status === 401 || status === 403) {
      return {
        success: false,
        error:
          "Unauthenticated. Stallion rejected the request — check your STALLION_API_KEY and environment configuration.",
        details: remote,
      };
    }

    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: remote,
    };
  }
};

/**
 * Cancel a shipment
 * @param {string} shipmentId - Shipment ID to cancel
 * @returns {Promise<Object>} Cancellation result
 */
const cancelShipment = async (shipmentId) => {
  try {
    const response = await stallionClient.delete(`/shipments/${shipmentId}`);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

/**
 * Verify webhook signature (if Stallion provides webhook signing)
 * @param {string} payload - Raw webhook payload
 * @param {string} signature - Signature from webhook header
 * @returns {boolean} Whether signature is valid
 */
const verifyWebhookSignature = (payload, signature) => {
  // TODO: Implement signature verification when Stallion provides webhook secret
  // For now, return true if signature exists
  const webhookSecret = process.env.STALLION_WEBHOOK_SECRET;
  if (!webhookSecret || !signature) {
    return true; // Skip verification if no secret configured
  }

  // Implement HMAC verification here when available
  // const crypto = require('crypto');
  // const expectedSignature = crypto
  //   .createHmac('sha256', webhookSecret)
  //   .update(payload)
  //   .digest('hex');
  // return signature === expectedSignature;

  return true;
};

module.exports = {
  getPostageTypes,
  getRates,
  createShipment,
  trackShipment,
  cancelShipment,
  verifyWebhookSignature,
};
