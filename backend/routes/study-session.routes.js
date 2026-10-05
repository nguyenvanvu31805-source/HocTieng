const express = require("express");
const studySessionController = require("../controllers/study-session.controller");
const asyncHandler = require("../utils/asyncHandler");
const {authenticate} = require("../middleware/auth.middleware");

const router = express.Router();

router.post(
  "/study-sessions",
  authenticate,
  asyncHandler(studySessionController.startSession)
);

router.patch(
  "/study-sessions/:sessionId/complete",
  authenticate,
  asyncHandler(studySessionController.completeSession)
);

router.get(
  "/study-sessions",
  authenticate,
  asyncHandler(studySessionController.getSessions)
);

router.get(
  "/study-sessions/stats",
  authenticate,
  asyncHandler(studySessionController.getStudyStats)
);

router.get(
  "/study-sessions/:sessionId",
  authenticate,
  asyncHandler(studySessionController.getSessionDetail)
);

module.exports = router;
