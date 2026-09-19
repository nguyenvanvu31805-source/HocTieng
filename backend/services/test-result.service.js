const AppError = require("../utils/appError");
const authRepository = require("../repositories/auth.repository");
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
  Number(((correctAnswers / totalQuestions) * 100).toFixed(2));

const createTestResult = async (user, payload) => {
  const userId = await requireActiveUser(user);
  const setId = parsePositiveId(payload.set_id ?? payload.setId, "set_id");
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

  const studySet = await studySetRepository.findById(setId);
  if (!studySet) throw new AppError("Study Set not found", 404);
  if (!canViewSet(studySet, user)) {
    throw new AppError("You do not have permission to test this Study Set", 403);
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

module.exports = {createTestResult};
