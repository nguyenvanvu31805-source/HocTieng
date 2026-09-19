const express = require("express");
const testResultController = require("../controllers/test-result.controller");
const asyncHandler = require("../utils/asyncHandler");
const {authenticate} = require("../middleware/auth.middleware");

const router = express.Router();

router.post(
  "/test-results",
  authenticate,
  asyncHandler(testResultController.createTestResult),
);

module.exports = router;
