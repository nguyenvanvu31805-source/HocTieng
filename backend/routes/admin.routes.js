const express = require("express");
const adminController = require("../controllers/admin.controller");
const asyncHandler = require("../utils/asyncHandler");
const {authenticate} = require("../middleware/auth.middleware");
const {authorize} = require("../middleware/role.middleware");

const router = express.Router();
const adminOnly = [authenticate, authorize("ADMIN")];

router.get("/users", ...adminOnly, asyncHandler(adminController.getUsers));
router.get("/users/:id", ...adminOnly, asyncHandler(adminController.getUser));
router.patch(
  "/users/:id/status",
  ...adminOnly,
  asyncHandler(adminController.updateUserStatus),
);
router.get(
  "/dashboard/stats",
  ...adminOnly,
  asyncHandler(adminController.getDashboardStats),
);

module.exports = router;
