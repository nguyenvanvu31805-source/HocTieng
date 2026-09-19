const express = require("express");
const assignmentController = require("../controllers/assignment.controller");
const asyncHandler = require("../utils/asyncHandler");
const {authenticate} = require("../middleware/auth.middleware");

const router = express.Router();

router.post(
  "/classes/:classId/assignments",
  authenticate,
  asyncHandler(assignmentController.createAssignment),
);

router.get(
  "/classes/:classId/assignments",
  authenticate,
  asyncHandler(assignmentController.getClassAssignments),
);

router.get(
  "/assignments/:assignmentId",
  authenticate,
  asyncHandler(assignmentController.getAssignmentDetail),
);

router.patch(
  "/assignments/:assignmentId",
  authenticate,
  asyncHandler(assignmentController.updateAssignment),
);

router.delete(
  "/assignments/:assignmentId",
  authenticate,
  asyncHandler(assignmentController.deleteAssignment),
);

module.exports = router;
