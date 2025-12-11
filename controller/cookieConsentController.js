const CookieConsent = require("../models/CookieConsent");

// Save cookie consent
const saveCookieConsent = async (req, res) => {
  try {
    const {
      sessionId,
      userId,
      consentType,
      cookiePreferences,
      userAgent,
      ipAddress,
      country,
      city,
      browser,
      device,
      os,
      referrer,
      pageUrl,
    } = req.body;

    const newConsent = new CookieConsent({
      sessionId,
      userId: userId || null,
      consentType,
      cookiePreferences: cookiePreferences || {
        necessary: true,
        analytics: consentType === "accepted",
        marketing: consentType === "accepted",
        functional: consentType === "accepted",
      },
      userAgent,
      ipAddress,
      country,
      city,
      browser,
      device,
      os,
      referrer,
      pageUrl,
    });

    await newConsent.save();

    res.status(200).send({
      message: "Cookie consent saved successfully!",
      consent: newConsent,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Get all cookie consents with pagination and filters
const getAllCookieConsents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      consentType,
      device,
      country,
      startDate,
      endDate,
      search,
    } = req.query;

    const skip = (page - 1) * limit;

    let query = {};

    // Filter by consent type
    if (consentType && consentType !== "all") {
      query.consentType = consentType;
    }

    // Filter by device
    if (device && device !== "all") {
      query.device = device;
    }

    // Filter by country
    if (country && country !== "all") {
      query.country = country;
    }

    // Filter by date range
    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: end,
      };
    } else if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      query.createdAt = { $lte: end };
    }

    // Search by session ID or IP
    if (search) {
      query.$or = [
        { sessionId: { $regex: search, $options: "i" } },
        { ipAddress: { $regex: search, $options: "i" } },
      ];
    }

    const consents = await CookieConsent.find(query)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalDoc = await CookieConsent.countDocuments(query);

    res.send({
      consents,
      totalDoc,
      limit: parseInt(limit),
      page: parseInt(page),
      totalPages: Math.ceil(totalDoc / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Get cookie consent statistics
const getCookieConsentStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: end,
        },
      };
    }

    // Total consents
    const totalConsents = await CookieConsent.countDocuments(dateFilter);

    // Consent type breakdown
    const consentTypeStats = await CookieConsent.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$consentType",
          count: { $sum: 1 },
        },
      },
    ]);

    // Device breakdown
    const deviceStats = await CookieConsent.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$device",
          count: { $sum: 1 },
        },
      },
    ]);

    // Country breakdown (top 10)
    const countryStats = await CookieConsent.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$country",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Browser breakdown
    const browserStats = await CookieConsent.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$browser",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Consent trends (daily for last 30 days or specified range)
    const trendStats = await CookieConsent.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            consentType: "$consentType",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    // Cookie preferences breakdown
    const preferencesStats = await CookieConsent.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          analyticsAccepted: {
            $sum: { $cond: ["$cookiePreferences.analytics", 1, 0] },
          },
          marketingAccepted: {
            $sum: { $cond: ["$cookiePreferences.marketing", 1, 0] },
          },
          functionalAccepted: {
            $sum: { $cond: ["$cookiePreferences.functional", 1, 0] },
          },
        },
      },
    ]);

    res.send({
      totalConsents,
      consentTypeStats: consentTypeStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      deviceStats: deviceStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      countryStats,
      browserStats,
      trendStats,
      preferencesStats: preferencesStats[0] || {
        analyticsAccepted: 0,
        marketingAccepted: 0,
        functionalAccepted: 0,
      },
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Get single consent by ID
const getCookieConsentById = async (req, res) => {
  try {
    const consent = await CookieConsent.findById(req.params.id).populate(
      "userId",
      "name email"
    );

    if (!consent) {
      return res.status(404).send({
        message: "Cookie consent not found!",
      });
    }

    res.send(consent);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Delete consent (for GDPR compliance)
const deleteCookieConsent = async (req, res) => {
  try {
    await CookieConsent.findByIdAndDelete(req.params.id);
    res.status(200).send({
      message: "Cookie consent deleted successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Export data for GDPR compliance
const exportCookieConsents = async (req, res) => {
  try {
    const { startDate, endDate, consentType } = req.query;

    let query = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (consentType && consentType !== "all") {
      query.consentType = consentType;
    }

    const consents = await CookieConsent.find(query)
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.send({
      data: consents,
      count: consents.length,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  saveCookieConsent,
  getAllCookieConsents,
  getCookieConsentStats,
  getCookieConsentById,
  deleteCookieConsent,
  exportCookieConsents,
};
