const express = require("express");
const router = express.Router();
const {
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
} = require("../controller/pageController");

//add a page
router.post("/add", addPage);

//get all pages with pagination
router.get("/", getAllPages);

//get all pages without pagination
router.get("/all", getAllPagesWithoutPagination);

//get a page by ID
router.get("/:id", getPageById);

//get a page by slug
router.get("/slug/:slug", getPageBySlug);

//update a page
router.put("/:id", updatePage);

//update page status
router.put("/status/:id", updateStatus);

//delete a page
router.delete("/:id", deletePage);

//update many pages
router.patch("/update/many", updateManyPages);

//delete many pages
router.patch("/delete/many", deleteManyPages);

module.exports = router;
