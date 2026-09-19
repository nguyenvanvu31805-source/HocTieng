const AppError = require("../utils/appError");
const authRepository = require("../repositories/auth.repository");
const bookmarkRepository = require("../repositories/bookmark.repository");
const studySetRepository = require("../repositories/study-set.repository");

const parsePositiveId = (value, fieldName) => {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1) {
    throw new AppError(`${fieldName} must be a positive integer`, 400);
  }
  return Number(value);
};

const getUserId = (user) => user && Number(user.user_id);

const isAdmin = (user) => user && user.role === "ADMIN";

const canViewSet = (studySet, user) => {
  if (isAdmin(user)) return true;
  if (!studySet || studySet.status === "DELETED") return false;
  if (studySet.visibility === "PUBLIC" && studySet.status === "ACTIVE") {
    return true;
  }
  return Boolean(user && Number(studySet.creator_id) === getUserId(user));
};

const requireActiveUser = async (user) => {
  const userId = getUserId(user);
  if (!userId) throw new AppError("Authentication token is required", 401);

  const currentUser = await authRepository.findById(userId);
  if (!currentUser) throw new AppError("User not found", 401);
  if (currentUser.status !== "ACTIVE") {
    throw new AppError("This account is not active", 403);
  }

  return userId;
};

const getStudySetOrThrow = async (setId) => {
  const studySet = await studySetRepository.findById(setId);
  if (!studySet) throw new AppError("Study Set not found", 404);
  return studySet;
};

const isBookmarked = async (setIdValue, user) => {
  const userId = await requireActiveUser(user);
  const setId = parsePositiveId(setIdValue, "setId");
  const studySet = await getStudySetOrThrow(setId);

  if (!canViewSet(studySet, user)) {
    throw new AppError("You do not have permission to view this Study Set", 403);
  }

  const existing = await bookmarkRepository.findByUserAndSet(userId, setId);
  return {bookmarked: Boolean(existing)};
};

const addBookmark = async (setIdValue, user) => {
  const userId = await requireActiveUser(user);
  const setId = parsePositiveId(setIdValue, "setId");
  const studySet = await getStudySetOrThrow(setId);

  if (!canViewSet(studySet, user)) {
    throw new AppError("You do not have permission to bookmark this Study Set", 403);
  }

  await bookmarkRepository.create(userId, setId);
  return {bookmarked: true};
};

const removeBookmark = async (setIdValue, user) => {
  const userId = await requireActiveUser(user);
  const setId = parsePositiveId(setIdValue, "setId");
  const studySet = await getStudySetOrThrow(setId);

  if (!canViewSet(studySet, user)) {
    throw new AppError("You do not have permission to access this Study Set", 403);
  }

  await bookmarkRepository.remove(userId, setId);
  return {bookmarked: false};
};

const getUserBookmarks = async (user) => {
  const userId = await requireActiveUser(user);
  return bookmarkRepository.findUserBookmarks(userId);
};

module.exports = {
  isBookmarked,
  addBookmark,
  removeBookmark,
  getUserBookmarks,
};
