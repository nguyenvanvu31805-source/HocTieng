const AppError = require("../utils/appError");
const authRepository = require("../repositories/auth.repository");
const studySetRepository = require("../repositories/study-set.repository");
const studySessionRepository = require("../repositories/study-session.repository");

const ALLOWED_MODES = ["FLASHCARDS", "LEARN", "TEST", "MATCH", "WEAK_REVIEW"];

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

const getDayDiff = (dateStr1, dateStr2) => {
  const d1 = new Date(dateStr1 + "T00:00:00Z");
  const d2 = new Date(dateStr2 + "T00:00:00Z");
  return Math.round((d1.getTime() - d2.getTime()) / (24 * 60 * 60 * 1000));
};

const calculateStreaks = (uniqueDatesSet, todayStr) => {
  const todayStudied = uniqueDatesSet.has(todayStr);

  const todayDate = new Date(todayStr + "T00:00:00Z");
  const yesterdayDate = new Date(todayDate.getTime() - 24 * 60 * 60 * 1000);
  const yyyy = yesterdayDate.getUTCFullYear();
  const mm = String(yesterdayDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(yesterdayDate.getUTCDate()).padStart(2, "0");
  const yesterdayStr = `${yyyy}-${mm}-${dd}`;

  let currentStreak = 0;
  let checkDateStr = null;

  if (todayStudied) {
    checkDateStr = todayStr;
  } else if (uniqueDatesSet.has(yesterdayStr)) {
    checkDateStr = yesterdayStr;
  }

  if (checkDateStr) {
    let d = new Date(checkDateStr + "T00:00:00Z");
    while (true) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dt = String(d.getUTCDate()).padStart(2, "0");
      const curStr = `${y}-${m}-${dt}`;
      if (uniqueDatesSet.has(curStr)) {
        currentStreak++;
        d.setUTCDate(d.getUTCDate() - 1);
      } else {
        break;
      }
    }
  }

  const sortedDates = Array.from(uniqueDatesSet).sort();
  let longestStreak = 0;
  let runningStreak = 0;
  let prevDate = null;

  for (const dateStr of sortedDates) {
    if (!prevDate) {
      runningStreak = 1;
    } else {
      const diff = getDayDiff(dateStr, prevDate);
      if (diff === 1) {
        runningStreak++;
      } else {
        runningStreak = 1;
      }
    }
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
    prevDate = dateStr;
  }

  return {
    todayStudied,
    currentStreak,
    longestStreak,
  };
};

const startSession = async (user, data = {}) => {
  const userId = await requireActiveUser(user);

  const mode = String(data.mode || "").trim().toUpperCase();
  if (!ALLOWED_MODES.includes(mode)) {
    throw new AppError(
      `Invalid mode. Must be one of: ${ALLOWED_MODES.join(", ")}`,
      400
    );
  }

  let setId = null;
  if (data.set_id !== undefined && data.set_id !== null && data.set_id !== "") {
    setId = parsePositiveId(data.set_id, "set_id");
    const studySet = await studySetRepository.findById(setId);
    if (!studySet || studySet.status === "DELETED") {
      throw new AppError("Study set not found", 404);
    }
    if (!canViewSet(studySet, user)) {
      throw new AppError("You do not have access to this study set", 403);
    }
  }

  const session = await studySessionRepository.createSession({
    userId,
    setId,
    mode,
    startedAt: data.started_at || null,
  });

  return session;
};

const completeSession = async (user, sessionIdParam, data = {}) => {
  const userId = await requireActiveUser(user);
  const sessionId = parsePositiveId(sessionIdParam, "sessionId");

  const existing = await studySessionRepository.findById(sessionId);
  if (!existing) {
    throw new AppError("Study session not found", 404);
  }

  if (existing.user_id !== userId) {
    throw new AppError("You do not have permission to modify this study session", 403);
  }

  let score = null;
  if (data.score !== undefined && data.score !== null && data.score !== "") {
    const numScore = Number(data.score);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      throw new AppError("score must be a number between 0 and 100", 400);
    }
    score = Number(numScore.toFixed(2));
  } else if (existing.score !== null) {
    score = existing.score;
  }

  let cardsStudied = 0;
  if (data.cards_studied !== undefined && data.cards_studied !== null && data.cards_studied !== "") {
    const numCards = Number(data.cards_studied);
    if (!Number.isInteger(numCards) || numCards < 0) {
      throw new AppError("cards_studied must be an integer >= 0", 400);
    }
    cardsStudied = numCards;
  } else if (existing.cards_studied > 0) {
    cardsStudied = existing.cards_studied;
  }

  const updatedSession = await studySessionRepository.updateCompletion(sessionId, {
    endedAt: data.ended_at || null,
    score,
    cardsStudied,
  });

  return updatedSession;
};

const getStudyStats = async (user) => {
  const userId = await requireActiveUser(user);

  const [completedSessions, todayStr] = await Promise.all([
    studySessionRepository.getCompletedSessionsByUser(userId),
    studySessionRepository.getDbTodayDate(),
  ]);

  const uniqueDatesSet = new Set(completedSessions.map((s) => s.study_date));
  const streaks = calculateStreaks(uniqueDatesSet, todayStr);

  const totalSessions = completedSessions.length;
  const totalDurationSeconds = completedSessions.reduce(
    (sum, s) => sum + (s.duration_seconds || 0),
    0
  );
  const totalStudyDays = uniqueDatesSet.size;

  const todaySessions = completedSessions.filter((s) => s.study_date === todayStr);
  const todayDurationSeconds = todaySessions.reduce(
    (sum, s) => sum + (s.duration_seconds || 0),
    0
  );

  return {
    current_streak: streaks.currentStreak,
    longest_streak: streaks.longestStreak,
    total_study_days: totalStudyDays,
    total_sessions: totalSessions,
    total_duration_seconds: totalDurationSeconds,
    today_studied: streaks.todayStudied,
    today_duration_seconds: todayDurationSeconds,
  };
};

const getSessions = async (user, query = {}) => {
  const userId = await requireActiveUser(user);

  let mode = null;
  if (query.mode && query.mode !== "ALL") {
    const rawMode = String(query.mode).trim().toUpperCase();
    if (!ALLOWED_MODES.includes(rawMode)) {
      throw new AppError(
        `Invalid mode. Must be one of: ${ALLOWED_MODES.join(", ")}`,
        400
      );
    }
    mode = rawMode;
  }

  const limit = Math.min(Math.max(1, Number(query.limit) || 50), 100);
  const page = Math.max(1, Number(query.page) || 1);
  const offset = (page - 1) * limit;

  const sessions = await studySessionRepository.getSessionsByUser(userId, {
    mode,
    limit,
    offset,
  });

  return sessions;
};

const getSessionDetail = async (user, sessionIdParam) => {
  const userId = await requireActiveUser(user);
  const sessionId = parsePositiveId(sessionIdParam, "sessionId");

  const session = await studySessionRepository.findDetailById(sessionId);
  if (!session) {
    throw new AppError("Study session not found", 404);
  }

  if (session.user_id !== userId && !isAdmin(user)) {
    throw new AppError("You do not have permission to view this study session", 403);
  }

  return session;
};

module.exports = {
  startSession,
  completeSession,
  getStudyStats,
  getSessions,
  getSessionDetail,
  calculateStreaks,
};
