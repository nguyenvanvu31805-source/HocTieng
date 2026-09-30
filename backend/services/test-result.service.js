const AppError = require("../utils/appError");
const authRepository = require("../repositories/auth.repository");
const cardRepository = require("../repositories/card.repository");
const studySetRepository = require("../repositories/study-set.repository");
const testResultRepository = require("../repositories/test-result.repository");

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

const parseWholeNumber = (value, fieldName) => {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue)) {
    throw new AppError(`${fieldName} must be an integer`, 400);
  }
  return numberValue;
};

const calculateScore = (correctAnswers, totalQuestions) =>
  totalQuestions > 0
    ? Number(((correctAnswers / totalQuestions) * 100).toFixed(2))
    : 0;

const normalizeString = (str) =>
  String(str || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const stripTrailingPunctuation = (str) =>
  str.replace(/[.,?!]+$/g, "").trim();

const isAnswerCorrect = (userAnswer, targetDefinition) => {
  const normUser = normalizeString(userAnswer);
  const normTarget = normalizeString(targetDefinition);

  if (!normUser || !normTarget) return false;
  if (normUser === normTarget) return true;

  const strippedUser = stripTrailingPunctuation(normUser);
  const strippedTarget = stripTrailingPunctuation(normTarget);
  if (strippedUser === strippedTarget) return true;

  const subDefinitions = normTarget
    .split(/[,;/]+/)
    .map((item) => stripTrailingPunctuation(normalizeString(item)))
    .filter(Boolean);

  if (subDefinitions.includes(strippedUser)) return true;

  return false;
};

const createTestResult = async (user, payload) => {
  const userId = await requireActiveUser(user);
  const setId = parsePositiveId(payload.set_id ?? payload.setId, "set_id");

  const studySet = await studySetRepository.findById(setId);
  if (!studySet) throw new AppError("Study Set not found", 404);
  if (!canViewSet(studySet, user)) {
    throw new AppError("You do not have permission to test this Study Set", 403);
  }

  // Check if payload has details array
  if (payload.details !== undefined && payload.details !== null) {
    if (!Array.isArray(payload.details)) {
      throw new AppError("details must be an array", 400);
    }
    if (payload.details.length === 0) {
      throw new AppError("details must not be empty", 400);
    }

    const seenCardIds = new Set();
    const validatedItems = [];

    for (let i = 0; i < payload.details.length; i++) {
      const item = payload.details[i];
      if (!item || typeof item !== "object") {
        throw new AppError(`Item at index ${i} in details must be an object`, 400);
      }
      const cardId = parsePositiveId(item.card_id, `details[${i}].card_id`);
      if (seenCardIds.has(cardId)) {
        throw new AppError(`Duplicate card_id (${cardId}) in test details`, 400);
      }
      seenCardIds.add(cardId);

      const questionOrder =
        item.question_order !== undefined
          ? parseWholeNumber(item.question_order, `details[${i}].question_order`)
          : i + 1;

      validatedItems.push({
        card_id: cardId,
        question_order: questionOrder,
        user_answer:
          item.user_answer !== undefined && item.user_answer !== null
            ? String(item.user_answer).trim()
            : null,
      });
    }

    // Verify all cards belong to the set
    const cards = await cardRepository.findByIds(Array.from(seenCardIds), setId);
    if (cards.length !== seenCardIds.size) {
      throw new AppError("One or more cards do not belong to this Study Set", 400);
    }

    const cardMap = new Map(cards.map((c) => [c.card_id, c]));

    const processedDetails = validatedItems.map((item) => {
      const card = cardMap.get(item.card_id);
      const isCorrect = isAnswerCorrect(item.user_answer, card.definition);

      return {
        card_id: card.card_id,
        question_order: item.question_order,
        user_answer: item.user_answer,
        correct_answer: card.definition,
        is_correct: isCorrect,
        term: card.term,
        definition: card.definition,
        pronunciation: card.pronunciation || null,
        example: card.example || null,
        audio_url: card.audio_url || null,
      };
    });

    const totalQuestions = processedDetails.length;
    const correctAnswers = processedDetails.filter((d) => d.is_correct).length;
    const score = calculateScore(correctAnswers, totalQuestions);

    const cardProgressUpdates = processedDetails.map((d) => ({
      cardId: d.card_id,
      correct: d.is_correct,
    }));

    return testResultRepository.createWithDetails({
      userId,
      setId,
      totalQuestions,
      correctAnswers,
      score,
      details: processedDetails,
      cardProgressUpdates,
    });
  }

  // Backward compatibility: old format without details
  const totalQuestions = parseWholeNumber(
    payload.total_questions ?? payload.totalQuestions,
    "total_questions",
  );
  const correctAnswers = parseWholeNumber(
    payload.correct_answers ?? payload.correctAnswers,
    "correct_answers",
  );

  if (totalQuestions <= 0) {
    throw new AppError("total_questions must be greater than 0", 400);
  }
  if (correctAnswers < 0) {
    throw new AppError("correct_answers must be greater than or equal to 0", 400);
  }
  if (correctAnswers > totalQuestions) {
    throw new AppError(
      "correct_answers must be less than or equal to total_questions",
      400,
    );
  }

  const score = calculateScore(correctAnswers, totalQuestions);
  if (payload.score !== undefined && payload.score !== null) {
    const submittedScore = Number(payload.score);
    if (!Number.isFinite(submittedScore) || submittedScore < 0 || submittedScore > 100) {
      throw new AppError("score must be between 0 and 100", 400);
    }
    if (Math.abs(submittedScore - score) > 0.01) {
      throw new AppError("score does not match submitted answers", 400);
    }
  }

  return testResultRepository.create({
    userId,
    setId,
    totalQuestions,
    correctAnswers,
    score,
  });
};

const getTestResult = async (user, resultId) => {
  const userId = await requireActiveUser(user);
  const parsedResultId = parsePositiveId(resultId, "resultId");

  const result = await testResultRepository.findResultWithDetails(parsedResultId);
  if (!result) {
    throw new AppError("Test result not found", 404);
  }

  if (!isAdmin(user) && Number(result.user_id) !== userId) {
    throw new AppError("You do not have permission to view this test result", 403);
  }

  return result;
};

module.exports = {
  createTestResult,
  getTestResult,
};
