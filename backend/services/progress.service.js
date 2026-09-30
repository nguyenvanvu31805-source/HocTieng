const AppError = require("../utils/appError");
const authRepository = require("../repositories/auth.repository");
const cardRepository = require("../repositories/card.repository");
const progressRepository = require("../repositories/progress.repository");
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

const getProgressByStudySet = async (setIdValue, user) => {
  const userId = await requireActiveUser(user);
  const setId = parsePositiveId(setIdValue, "setId");
  const studySet = await getStudySetOrThrow(setId);

  if (!canViewSet(studySet, user)) {
    throw new AppError("You do not have permission to learn this Study Set", 403);
  }

  const records = await progressRepository.findByUserAndStudySet(userId, setId);
  const cards = await cardRepository.findBySetId(setId);
  const totalCards = cards.length;
  const studiedCards = records.length;
  const progressPercent =
    totalCards > 0 ? Math.round((studiedCards / totalCards) * 100) : 0;

  const mastery = {
    not_started: 0,
    learning: 0,
    basic: 0,
    mastered: 0,
  };

  const recordMap = new Map();
  records.forEach((rec) => recordMap.set(rec.card_id, rec));

  cards.forEach((card) => {
    const rec = recordMap.get(card.card_id);
    if (!rec) {
      mastery.not_started += 1;
    } else {
      const level = Number(rec.mastery_level);
      if (level === 1) mastery.learning += 1;
      else if (level === 2) mastery.basic += 1;
      else if (level === 3) mastery.mastered += 1;
      else mastery.not_started += 1;
    }
  });

  const filterCounts = await cardRepository.countByFilters(setId, userId);

  return {
    set_id: setId,
    total_cards: totalCards,
    studied_cards: studiedCards,
    progress_percent: progressPercent,
    mastery,
    counts: filterCounts,
    records,
  };
};

const reviewCard = async (cardIdValue, user, {correct}) => {
  const userId = await requireActiveUser(user);
  const cardId = parsePositiveId(cardIdValue, "cardId");

  if (typeof correct !== "boolean") {
    throw new AppError("correct must be a boolean", 400);
  }

  const card = await cardRepository.findById(cardId);
  if (!card) throw new AppError("Card not found", 404);

  const studySet = await getStudySetOrThrow(card.set_id);
  if (!canViewSet(studySet, user)) {
    throw new AppError("You do not have permission to learn this Study Set", 403);
  }

  return progressRepository.saveReview({userId, cardId, correct});
};

const getWeakCards = async (user, query = {}) => {
  const userId = await requireActiveUser(user);

  // Validate filter
  let filter = "all";
  if (query.filter !== undefined && query.filter !== null && String(query.filter).trim() !== "") {
    const rawFilter = String(query.filter).toLowerCase().trim();
    const allowedFilters = ["all", "most_wrong", "low_mastery"];
    if (!allowedFilters.includes(rawFilter)) {
      throw new AppError(
        `Invalid filter value. Allowed filters: ${allowedFilters.join(", ")}`,
        400,
      );
    }
    filter = rawFilter;
  }

  // Validate page
  let page = 1;
  if (query.page !== undefined && query.page !== null && String(query.page).trim() !== "") {
    const rawPage = String(query.page).trim();
    if (!/^\d+$/.test(rawPage) || Number(rawPage) < 1) {
      throw new AppError("page must be a positive integer", 400);
    }
    page = Number(rawPage);
  }

  // Validate limit
  let limit = 20;
  if (query.limit !== undefined && query.limit !== null && String(query.limit).trim() !== "") {
    const rawLimit = String(query.limit).trim();
    if (!/^\d+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 50) {
      throw new AppError("limit must be an integer between 1 and 50", 400);
    }
    limit = Number(rawLimit);
  }

  const offset = (page - 1) * limit;

  const [items, total] = await Promise.all([
    progressRepository.findWeakCardsByUser({ userId, filter, limit, offset }),
    progressRepository.countWeakCardsByUser(userId),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
    },
    summary: {
      total_weak_cards: total,
    },
  };
};

module.exports = {
  getProgressByStudySet,
  reviewCard,
  getWeakCards,
};

