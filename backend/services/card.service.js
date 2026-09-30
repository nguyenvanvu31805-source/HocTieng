const AppError = require("../utils/appError");
const cardRepository = require("../repositories/card.repository");
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

const canManageSet = (studySet, user) =>
  Boolean(
    isAdmin(user) ||
    (user && studySet && Number(studySet.creator_id) === getUserId(user)),
  );

const getStudySetOrThrow = async (setId) => {
  const studySet = await studySetRepository.findById(setId);
  if (!studySet) throw new AppError("Study Set not found", 404);
  return studySet;
};

const validateCardInput = ({term, definition}) => {
  if (!term || !definition) {
    throw new AppError("term and definition are required", 400);
  }
};

const validatePosition = (position) => {
  if (
    position !== undefined &&
    position !== null &&
    (!Number.isInteger(Number(position)) || Number(position) < 1)
  ) {
    throw new AppError("position must be a positive integer", 400);
  }
};

const normalizeCardInput = ({
  term,
  definition,
  pronunciation,
  example,
  image_url,
  imageUrl,
  audio_url,
  audioUrl,
  position,
}) => ({
  term,
  definition,
  pronunciation,
  example,
  imageUrl: image_url ?? imageUrl,
  audioUrl: audio_url ?? audioUrl,
  position,
});

const getCards = async (setIdValue, user, query = {}) => {
  const setId = parsePositiveId(setIdValue, "setId");
  const studySet = await getStudySetOrThrow(setId);
  if (!canViewSet(studySet, user)) {
    throw new AppError(
      "You do not have permission to view cards in this Study Set",
      403,
    );
  }

  const rawFilter = query && query.filter ? String(query.filter).toLowerCase().trim() : "all";
  const allowedFilters = ["all", "unlearned", "weak", "review", "mastered"];
  if (!allowedFilters.includes(rawFilter)) {
    throw new AppError(
      `Invalid filter value. Allowed filters: ${allowedFilters.join(", ")}`,
      400,
    );
  }

  const userId = getUserId(user);
  if (rawFilter !== "all" && !userId) {
    throw new AppError(
      "Authentication token is required to filter cards by study progress",
      401,
    );
  }

  if (rawFilter === "all") {
    return cardRepository.findBySetId(setId);
  }

  return cardRepository.findBySetIdAndFilter({ setId, userId, filter: rawFilter });
};

const createCard = async (setIdValue, user, cardData) => {
  const setId = parsePositiveId(setIdValue, "setId");
  const studySet = await getStudySetOrThrow(setId);
  if (!canManageSet(studySet, user)) {
    throw new AppError(
      "Only the Study Set creator or ADMIN can manage cards",
      403,
    );
  }
  const normalizedCard = normalizeCardInput(cardData);
  validateCardInput(normalizedCard);
  validatePosition(normalizedCard.position);
  return cardRepository.create({setId, ...normalizedCard});
};

const getCardAndSet = async (cardIdValue) => {
  const cardId = parsePositiveId(cardIdValue, "id");
  const card = await cardRepository.findById(cardId);
  if (!card) throw new AppError("Card not found", 404);
  const studySet = await getStudySetOrThrow(card.set_id);
  return {cardId, card, studySet};
};

const updateCard = async (cardIdValue, user, cardData) => {
  const {cardId, studySet} = await getCardAndSet(cardIdValue);
  if (!canManageSet(studySet, user)) {
    throw new AppError(
      "Only the Study Set creator or ADMIN can manage cards",
      403,
    );
  }
  const normalizedCard = normalizeCardInput(cardData);
  validateCardInput(normalizedCard);
  validatePosition(normalizedCard.position);
  return cardRepository.update(cardId, normalizedCard);
};

const deleteCard = async (cardIdValue, user) => {
  const {cardId, studySet} = await getCardAndSet(cardIdValue);
  if (!canManageSet(studySet, user)) {
    throw new AppError(
      "Only the Study Set creator or ADMIN can manage cards",
      403,
    );
  }
  await cardRepository.remove(cardId);
};

module.exports = {getCards, createCard, updateCard, deleteCard};
