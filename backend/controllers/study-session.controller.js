const studySessionService = require("../services/study-session.service");
const {success} = require("../utils/response");

const startSession = async (req, res) => {
  const result = await studySessionService.startSession(req.user, req.body);
  return success(res, result, "Study session started successfully", 201);
};

const completeSession = async (req, res) => {
  const result = await studySessionService.completeSession(
    req.user,
    req.params.sessionId,
    req.body
  );
  return success(res, result, "Study session completed successfully", 200);
};

const getStudyStats = async (req, res) => {
  const result = await studySessionService.getStudyStats(req.user);
  return success(res, result, "Study stats retrieved successfully", 200);
};

module.exports = {
  startSession,
  completeSession,
  getStudyStats,
};
