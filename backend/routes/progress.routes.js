const express = require("express");
const progressController = require("../controllers/progress.controller");
const asyncHandler = require("../utils/asyncHandler");
const {authenticate} = require("../middleware/auth.middleware");

const router = express.Router();

router.get(
  "/progress/weak",
  authenticate,
  asyncHandler(progressController.getWeakCards),
);

router.get(
  "/progress/study-sets/:setId",
  authenticate,
  asyncHandler(progressController.getStudySetProgress),
);

router.post(
  "/progress/cards/:cardId/review",
  authenticate,
  asyncHandler(progressController.reviewCard),
);

module.exports = router;
