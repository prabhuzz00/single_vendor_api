const express = require("express");
const router = express.Router();
const {
  getCustomProductSettings,
  updateCustomProductSettings,
  addShape,
  updateShape,
  deleteShape,
  addSizeRange,
  updateSizeRange,
  deleteSizeRange,
} = require("../controller/customProductController");
const { isAuth } = require("../config/auth");

// Get custom product settings (public route for client)
router.get("/settings", getCustomProductSettings);

// Admin routes (require authentication)
router.put("/settings", isAuth, updateCustomProductSettings);
router.post("/shapes", isAuth, addShape);
router.put("/shapes/:shapeId", isAuth, updateShape);
router.delete("/shapes/:shapeId", isAuth, deleteShape);
router.post("/size-ranges", isAuth, addSizeRange);
router.put("/size-ranges/:sizeId", isAuth, updateSizeRange);
router.delete("/size-ranges/:sizeId", isAuth, deleteSizeRange);

module.exports = router;
