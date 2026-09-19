const express = require("express");
const authRoutes = require("./auth.routes");
const cardRoutes = require("./card.routes");
const adminRoutes = require("./admin.routes");
const progressRoutes = require("./progress.routes");
const studySetRoutes = require("./study-set.routes");
const testResultRoutes = require("./test-result.routes");
const bookmarkRoutes = require("./bookmark.routes");
const classRoutes = require("./class.routes");
const assignmentRoutes = require("./assignment.routes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({success: true, message: "API is running", data: null});
});
router.use("/auth", authRoutes);
router.use(studySetRoutes);
router.use(adminRoutes);
router.use(cardRoutes);
router.use(progressRoutes);
router.use(testResultRoutes);
router.use(bookmarkRoutes);
router.use(classRoutes);
router.use(assignmentRoutes);

module.exports = router;
