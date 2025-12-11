const Page = require("../models/Page");

// Add new page
const addPage = async (req, res) => {
  try {
    const newPage = new Page(req.body);
    await newPage.save();
    res.status(200).send({
      message: "Page Added Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Get all pages with pagination and search
const getAllPages = async (req, res) => {
  try {
    const { page = 1, limit = 8, search = "" } = req.query;
    const pages = parseInt(page);
    const limits = parseInt(limit);

    let query = {};
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query = {
        $or: [{ "title.en": searchRegex }, { slug: searchRegex }],
      };
    }

    const totalDoc = await Page.countDocuments(query);
    const pagesData = await Page.find(query)
      .sort({ _id: -1 })
      .limit(limits)
      .skip((pages - 1) * limits);

    res.send({
      pages: pagesData,
      totalDoc,
      limits,
      currentPage: pages,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Get all pages without pagination
const getAllPagesWithoutPagination = async (req, res) => {
  try {
    const pages = await Page.find({ published: true }).sort({ _id: -1 });
    res.send(pages);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Get page by ID
const getPageById = async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);
    res.send(page);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Get page by slug
const getPageBySlug = async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug, published: true });
    if (!page) {
      return res.status(404).send({
        message: "Page not found!",
      });
    }
    res.send(page);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Update page
const updatePage = async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);
    if (page) {
      page.title = { ...page.title, ...req.body.title };
      page.slug = req.body.slug;
      page.description = { ...page.description, ...req.body.description };
      page.metaTitle = { ...page.metaTitle, ...req.body.metaTitle };
      page.metaDescription = {
        ...page.metaDescription,
        ...req.body.metaDescription,
      };
      page.headerBg = req.body.headerBg;
      page.images = req.body.images;
      page.status = req.body.status;
      page.published = req.body.published;

      await page.save();
      res.send({ message: "Page Updated Successfully!" });
    } else {
      res.status(404).send({
        message: "Page Not Found!",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Update page status
const updateStatus = async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);
    if (page) {
      page.status = req.body.status;
      page.published = req.body.published;
      await page.save();
      res.send({ message: "Page Status Updated Successfully!" });
    } else {
      res.status(404).send({
        message: "Page Not Found!",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Delete page
const deletePage = async (req, res) => {
  try {
    await Page.findByIdAndDelete(req.params.id);
    res.status(200).send({
      message: "Page Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Update many pages
const updateManyPages = async (req, res) => {
  try {
    const updateData = {};
    if (req.body.status) {
      updateData.status = req.body.status;
      updateData.published = req.body.status === "publish";
    }

    await Page.updateMany({ _id: { $in: req.body.ids } }, { $set: updateData });

    res.send({
      message: "Pages Updated Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Delete many pages
const deleteManyPages = async (req, res) => {
  try {
    await Page.deleteMany({ _id: req.body.ids });

    res.send({
      message: "Pages Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addPage,
  getAllPages,
  getAllPagesWithoutPagination,
  getPageById,
  getPageBySlug,
  updatePage,
  updateStatus,
  deletePage,
  updateManyPages,
  deleteManyPages,
};
