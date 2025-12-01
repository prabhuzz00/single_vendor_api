const mongoose = require("mongoose");

const sizeRangeSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
  },
  dimensions: {
    type: String,
    required: true,
  },
  basePrice: {
    type: Number,
    required: true,
  },
});

const shapeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
});

const customProductSchema = new mongoose.Schema(
  {
    featureEnabled: {
      type: Boolean,
      default: false,
    },
    shapes: [shapeSchema],
    sizeRanges: [sizeRangeSchema],
  },
  {
    timestamps: true,
  }
);

const CustomProduct = mongoose.model("CustomProduct", customProductSchema);

module.exports = CustomProduct;
