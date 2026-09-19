const express = require("express");
const bookmarkController = require("../controllers/bookmark.controller");
const asyncHandler = require("../utils/asyncHandler");
const {authenticate} = require("../middleware/auth.middleware");

const router = express.Router();

router.get(
  "/bookmarks",
  authenticate,
  asyncHandler(bookmarkController.getUserBookmarks),
);

router.get(
  "/bookmarks/:setId",
  authenticate,
  asyncHandler(bookmarkController.getBookmarkStatus),
);

router.post(
  "/bookmarks/:setId",
  authenticate,
  asyncHandler(bookmarkController.addBookmark),
);

router.delete(
  "/bookmarks/:setId",
  authenticate,
  asyncHandler(bookmarkController.removeBookmark),
);

module.exports = router;
