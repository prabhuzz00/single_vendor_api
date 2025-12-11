const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    title: {
      type: Object,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: Object,
      required: true,
    },
    metaTitle: {
      type: Object,
      required: false,
    },
    metaDescription: {
      type: Object,
      required: false,
    },
    headerBg: {
      type: String,
      required: false,
    },
    images: {
      type: Array,
      default: [],
      required: false,
    },
    status: {
      type: String,
      lowercase: true,
      enum: ["publish", "draft"],
      default: "draft",
    },
    published: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Page = mongoose.model("Page", pageSchema);

module.exports = Page;
