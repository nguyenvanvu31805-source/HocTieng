const express = require("express");
const classController = require("../controllers/class.controller");
const asyncHandler = require("../utils/asyncHandler");
const {authenticate} = require("../middleware/auth.middleware");

const router = express.Router();

router.post(
  "/classes",
  authenticate,
  asyncHandler(classController.createClass),
);

router.get(
  "/classes",
  authenticate,
  asyncHandler(classController.getMyClasses),
);

router.post(
  "/classes/join",
  authenticate,
  asyncHandler(classController.joinClass),
);

router.get(
  "/classes/:classId",
  authenticate,
  asyncHandler(classController.getClassDetail),
);

router.patch(
  "/classes/:classId",
  authenticate,
  asyncHandler(classController.updateClass),
);

router.get(
  "/classes/:classId/members",
  authenticate,
  asyncHandler(classController.getClassMembers),
);

router.delete(
  "/classes/:classId/members/me",
  authenticate,
  asyncHandler(classController.leaveClass),
);

router.delete(
  "/classes/:classId/members/:userId",
  authenticate,
  asyncHandler(classController.removeMember),
);

module.exports = router;
