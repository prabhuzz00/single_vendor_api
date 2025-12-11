const axios = require("axios");
const Setting = require("../models/Setting");

/**
 * Stallion Express Shipping Integration Service
 *
 * Configuration is now managed through the admin panel Store Settings.
 * Falls back to environment variables if not configured in database.
 *
 * Environment Variables (Fallback):
 * - STALLION_BASE_URL_SANDBOX: https://sandbox.stallionexpress.ca/api/v4/
 * - STALLION_BASE_URL_PROD: https://ship.stallionexpress.ca/api/v4/
 * - STALLION_API_KEY_SANDBOX: Your sandbox API key
 * - STALLION_API_KEY_PROD: Your production API key
 * - NODE_ENV: development | production
 */

const isDevelopment = process.env.NODE_ENV !== "production";

// Cache for Stallion config
let cachedConfig = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch Stallion configuration from database or environment variables
 */
async function getStallionConfig() {
  const now = Date.now();

  // Return cached config if still valid
  if (cachedConfig && now - lastFetchTime < CACHE_DURATION) {
    return cachedConfig;
  }

  try {
    const storeSetting = await Setting.findOne({ name: "storeSetting" });

    if (storeSetting && storeSetting.setting.stallion_status) {
      cachedConfig = {
        enabled: true,
        baseURL: isDevelopment
          ? storeSetting.setting.stallion_base_url_sandbox ||
            "https://sandbox.stallionexpress.ca/api/v4/"
          : storeSetting.setting.stallion_base_url_prod ||
            "https://ship.stallionexpress.ca/api/v4/",
        apiKey: isDevelopment
          ? storeSetting.setting.stallion_api_key_sandbox
          : storeSetting.setting.stallion_api_key_prod,
      };

      // Debug logging
      if (isDevelopment) {
        console.log("[Stallion Config] Loaded from database:", {
          enabled: cachedConfig.enabled,
          baseURL: cachedConfig.baseURL,
          apiKeyExists: !!cachedConfig.apiKey,
          apiKeyLength: cachedConfig.apiKey?.length || 0,
          environment: isDevelopment ? "sandbox" : "production",
        });
      }

      lastFetchTime = now;
      return cachedConfig;
    }
  } catch (error) {
    console.warn(
      "[Stallion] Failed to fetch config from database, using environment variables:",
      error.message
    );
  }

  // Fallback to environment variables
  cachedConfig = {
    enabled: true,
    baseURL: isDevelopment
      ? process.env.STALLION_BASE_URL_SANDBOX ||
        "https://sandbox.stallionexpress.ca/api/v4/"
      : process.env.STALLION_BASE_URL_PROD ||
        "https://ship.stallionexpress.ca/api/v4/",
    apiKey: isDevelopment
      ? process.env.STALLION_API_KEY_SANDBOX
      : process.env.STALLION_API_KEY_PROD,
  };

  // Debug logging for fallback
  if (isDevelopment) {
    console.log("[Stallion Config] Loaded from environment variables:", {
      enabled: cachedConfig.enabled,
      baseURL: cachedConfig.baseURL,
      apiKeyExists: !!cachedConfig.apiKey,
      apiKeyLength: cachedConfig.apiKey?.length || 0,
      environment: isDevelopment ? "sandbox" : "production",
    });
  }

  lastFetchTime = now;
  return cachedConfig;
}

// Create axios client for Stallion API
const stallionClient = axios.create({
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to dynamically set baseURL and auth header
stallionClient.interceptors.request.use(
  async (config) => {
    const stallionConfig = await getStallionConfig();

    // Set baseURL from config
    config.baseURL = stallionConfig.baseURL;

    // Ensure API key header is attached
    if (stallionConfig.apiKey) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${stallionConfig.apiKey}`;
    }

    if (isDevelopment) {
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
    const stallionConfig = await getStallionConfig();

    if (!stallionConfig.apiKey) {
      return {
        success: false,
        error:
          "Stallion API key not configured. Please set it in Admin Panel > Settings > Store Settings or in environment variables.",
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
  let stallionConfig;
  try {
    stallionConfig = await getStallionConfig();

    if (!stallionConfig.apiKey) {
      return {
        success: false,
        error:
          "Stallion API key not configured. Please set it in Admin Panel > Settings > Store Settings or in environment variables.",
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
      apiKeyPresent: Boolean(stallionConfig.apiKey),
      apiKeyEnding: stallionConfig.apiKey
        ? `...${String(stallionConfig.apiKey).slice(-4)}`
        : "none",
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
  let stallionConfig;
  try {
    stallionConfig = await getStallionConfig();

    if (!stallionConfig.apiKey) {
      return {
        success: false,
        error:
          "Stallion API key not configured. Please set it in Admin Panel > Settings > Store Settings or in environment variables.",
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
      apiKeyPresent: Boolean(stallionConfig.apiKey),
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
    const stallionConfig = await getStallionConfig();

    if (!stallionConfig.apiKey) {
      return {
        success: false,
        error:
          "Stallion API key not configured. Please set it in Admin Panel > Settings > Store Settings or in environment variables.",
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
