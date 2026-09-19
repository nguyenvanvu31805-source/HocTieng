const express = require("express");
const studySetController = require("../controllers/study-set.controller");
const asyncHandler = require("../utils/asyncHandler");
const {
  optionalAuthenticate,
} = require("../middleware/optional-auth.middleware");
const {authenticate} = require("../middleware/auth.middleware");
const {authorize} = require("../middleware/role.middleware");

const router = express.Router();

router.get(
  "/study-sets",
  optionalAuthenticate,
  asyncHandler(studySetController.getStudySets),
);
router.get(
  "/study-sets/my",
  authenticate,
  asyncHandler(studySetController.getMyStudySets),
);
router.post(
  "/study-sets",
  authenticate,
  asyncHandler(studySetController.createStudySet),
);
router.patch(
  "/study-sets/:id/status",
  authenticate,
  authorize("ADMIN"),
  asyncHandler(studySetController.updateStatus),
);
router.patch(
  "/study-sets/:id",
  authenticate,
  asyncHandler(studySetController.updateStudySet),
);
router.delete(
  "/study-sets/:id",
  authenticate,
  asyncHandler(studySetController.deleteStudySet),
);
router.get(
  "/study-sets/:id",
  optionalAuthenticate,
  asyncHandler(studySetController.getStudySet),
);

module.exports = router;
