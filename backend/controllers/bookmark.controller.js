const bookmarkService = require("../services/bookmark.service");
const {success} = require("../utils/response");

const getUserBookmarks = async (req, res) => {
  const bookmarks = await bookmarkService.getUserBookmarks(req.user);
  return success(res, bookmarks, "User bookmarks retrieved successfully");
};

const getBookmarkStatus = async (req, res) => {
  const result = await bookmarkService.isBookmarked(
    req.params.setId,
    req.user,
  );
  return success(res, result, "Bookmark status retrieved successfully");
};

const addBookmark = async (req, res) => {
  const result = await bookmarkService.addBookmark(
    req.params.setId,
    req.user,
  );
  return success(res, result, "Study set bookmarked successfully");
};

const removeBookmark = async (req, res) => {
  const result = await bookmarkService.removeBookmark(
    req.params.setId,
    req.user,
  );
  return success(res, result, "Bookmark removed successfully");
};

module.exports = {
  getUserBookmarks,
  getBookmarkStatus,
  addBookmark,
  removeBookmark,
};
