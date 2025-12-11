const mongoose = require("mongoose");

const cookieConsentSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    consentType: {
      type: String,
      required: true,
      enum: ["accepted", "rejected", "customized"],
    },
    cookiePreferences: {
      necessary: {
        type: Boolean,
        default: true, // Always true
      },
      analytics: {
        type: Boolean,
        default: false,
      },
      marketing: {
        type: Boolean,
        default: false,
      },
      functional: {
        type: Boolean,
        default: false,
      },
    },
    userAgent: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    country: {
      type: String,
    },
    city: {
      type: String,
    },
    browser: {
      type: String,
    },
    device: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "unknown"],
      default: "unknown",
    },
    os: {
      type: String,
    },
    referrer: {
      type: String,
    },
    pageUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
cookieConsentSchema.index({ createdAt: 1 });
cookieConsentSchema.index({ consentType: 1 });
cookieConsentSchema.index({ device: 1 });
cookieConsentSchema.index({ country: 1 });

const CookieConsent = mongoose.model("CookieConsent", cookieConsentSchema);

module.exports = CookieConsent;
