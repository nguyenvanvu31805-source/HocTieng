const adminService = require("../services/admin.service");
const {success} = require("../utils/response");

const getUsers = async (req, res) =>
  success(
    res,
    await adminService.getUsers({
      search: req.query.search,
      role: req.query.role,
      status: req.query.status,
    }),
    "Users retrieved successfully",
  );

const getUser = async (req, res) =>
  success(
    res,
    await adminService.getUser(req.params.id),
    "User retrieved successfully",
  );

const updateUserStatus = async (req, res) =>
  success(
    res,
    await adminService.updateUserStatus(req.params.id, req.body.status),
    "User status updated successfully",
  );

const getStudySets = async (req, res) =>
  success(
    res,
    await adminService.getStudySets(),
    "Study Sets retrieved successfully",
  );

const getDashboardStats = async (req, res) =>
  success(
    res,
    await adminService.getDashboardStats(),
    "Dashboard statistics retrieved successfully",
  );

module.exports = {
  getUsers,
  getUser,
  updateUserStatus,
  getStudySets,
  getDashboardStats,
};
