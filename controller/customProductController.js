const CustomProduct = require("../models/CustomProduct");

// Get custom product settings
const getCustomProductSettings = async (req, res) => {
  try {
    let settings = await CustomProduct.findOne();
    
    if (!settings) {
      // Create default settings if none exist
      settings = await CustomProduct.create({
        featureEnabled: false,
        shapes: [
          { name: "Circle", enabled: true },
          { name: "Square", enabled: true },
          { name: "Rectangle", enabled: true },
          { name: "Oval", enabled: true },
          { name: "Die-Cut", enabled: true },
        ],
        sizeRanges: [
          { label: "Small (2x2)", dimensions: "2x2", basePrice: 49.0 },
          { label: "Medium (3x3)", dimensions: "3x3", basePrice: 79.0 },
          { label: "Large (4x4)", dimensions: "4x4", basePrice: 119.0 },
          { label: "Extra Large (5x5)", dimensions: "5x5", basePrice: 169.0 },
        ],
      });
    }
    
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update custom product settings
const updateCustomProductSettings = async (req, res) => {
  try {
    const { featureEnabled, shapes, sizeRanges } = req.body;
    
    let settings = await CustomProduct.findOne();
    
    if (!settings) {
      settings = await CustomProduct.create({
        featureEnabled,
        shapes,
        sizeRanges,
      });
    } else {
      settings.featureEnabled = featureEnabled;
      settings.shapes = shapes;
      settings.sizeRanges = sizeRanges;
      await settings.save();
    }
    
    res.status(200).json({
      message: "Custom product settings updated successfully",
      settings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add new shape
const addShape = async (req, res) => {
  try {
    const { name } = req.body;
    
    let settings = await CustomProduct.findOne();
    
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }
    
    settings.shapes.push({ name, enabled: true });
    await settings.save();
    
    res.status(200).json({
      message: "Shape added successfully",
      settings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update shape
const updateShape = async (req, res) => {
  try {
    const { shapeId } = req.params;
    const { name, enabled } = req.body;
    
    let settings = await CustomProduct.findOne();
    
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }
    
    const shape = settings.shapes.id(shapeId);
    if (!shape) {
      return res.status(404).json({ message: "Shape not found" });
    }
    
    if (name !== undefined) shape.name = name;
    if (enabled !== undefined) shape.enabled = enabled;
    
    await settings.save();
    
    res.status(200).json({
      message: "Shape updated successfully",
      settings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete shape
const deleteShape = async (req, res) => {
  try {
    const { shapeId } = req.params;
    
    let settings = await CustomProduct.findOne();
    
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }
    
    settings.shapes.pull(shapeId);
    await settings.save();
    
    res.status(200).json({
      message: "Shape deleted successfully",
      settings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add new size range
const addSizeRange = async (req, res) => {
  try {
    const { label, dimensions, basePrice } = req.body;
    
    let settings = await CustomProduct.findOne();
    
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }
    
    settings.sizeRanges.push({ label, dimensions, basePrice });
    await settings.save();
    
    res.status(200).json({
      message: "Size range added successfully",
      settings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update size range
const updateSizeRange = async (req, res) => {
  try {
    const { sizeId } = req.params;
    const { label, dimensions, basePrice } = req.body;
    
    let settings = await CustomProduct.findOne();
    
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }
    
    const sizeRange = settings.sizeRanges.id(sizeId);
    if (!sizeRange) {
      return res.status(404).json({ message: "Size range not found" });
    }
    
    if (label !== undefined) sizeRange.label = label;
    if (dimensions !== undefined) sizeRange.dimensions = dimensions;
    if (basePrice !== undefined) sizeRange.basePrice = basePrice;
    
    await settings.save();
    
    res.status(200).json({
      message: "Size range updated successfully",
      settings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete size range
const deleteSizeRange = async (req, res) => {
  try {
    const { sizeId } = req.params;
    
    let settings = await CustomProduct.findOne();
    
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }
    
    settings.sizeRanges.pull(sizeId);
    await settings.save();
    
    res.status(200).json({
      message: "Size range deleted successfully",
      settings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCustomProductSettings,
  updateCustomProductSettings,
  addShape,
  updateShape,
  deleteShape,
  addSizeRange,
  updateSizeRange,
  deleteSizeRange,
};
