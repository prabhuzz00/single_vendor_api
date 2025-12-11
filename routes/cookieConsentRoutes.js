const express = require("express");
const router = express.Router();
const {
  saveCookieConsent,
  getAllCookieConsents,
  getCookieConsentStats,
  getCookieConsentById,
  deleteCookieConsent,
  exportCookieConsents,
} = require("../controller/cookieConsentController");
const { isAuth } = require("../config/auth");

// Public route - save cookie consent (no auth required)
router.post("/", saveCookieConsent);

// Admin routes - require authentication
router.get("/", isAuth, getAllCookieConsents);
router.get("/statistics", isAuth, getCookieConsentStats);
router.get("/export", isAuth, exportCookieConsents);
router.get("/:id", isAuth, getCookieConsentById);
router.delete("/:id", isAuth, deleteCookieConsent);

module.exports = router;
