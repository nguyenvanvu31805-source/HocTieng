const adminRepository = require("../repositories/admin.repository");

const AppError = require("../utils/appError");

const parseUserId = (value) => {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1) {
    throw new AppError("user id must be a positive integer", 400);
  }
  return Number(value);
};

const getUsers = ({search, role, status} = {}) => {
  const validRoles = ["ADMIN", "TEACHER", "STUDENT"];
  const validStatuses = ["ACTIVE", "LOCKED", "BANNED"];
  if (role && !validRoles.includes(role))
    throw new AppError("Invalid role", 400);
  if (status && !validStatuses.includes(status))
    throw new AppError("Invalid status", 400);
  return adminRepository.findUsers({search: search?.trim(), role, status});
};

const getUser = async (userIdValue) => {
  const userId = parseUserId(userIdValue);
  const user = await adminRepository.findUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  return user;
};

const updateUserStatus = async (userIdValue, status) => {
  const userId = parseUserId(userIdValue);
  if (!["ACTIVE", "LOCKED", "BANNED"].includes(status)) {
    throw new AppError("Invalid status", 400);
  }
  const user = await getUser(userId);
  await adminRepository.updateUserStatus(userId, status);
  return {...user, status};
};

const getStudySets = () => adminRepository.findStudySets();
const getDashboardStats = () => adminRepository.getDashboardStats();

module.exports = {
  getUsers,
  getUser,
  updateUserStatus,
  getStudySets,
  getDashboardStats,
};
