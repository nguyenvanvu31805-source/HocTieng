const authService = require("../services/auth.service");
const {success} = require("../utils/response");

const register = async (req, res) => {
  const user = await authService.register(req.body);
  return success(res, user, "Registered successfully", 201);
};

const login = async (req, res) => {
  const result = await authService.login(req.body);
  return success(res, result, "Login successful");
};

const me = async (req, res) => {
  const user = await authService.getCurrentUser(req.user.user_id);
  return success(res, user, "Current user retrieved successfully");
};

const updateProfile = async (req, res) => {
  const user = await authService.updateProfile(req.user.user_id, req.body);
  return success(res, user, "Profile updated successfully");
};

module.exports = {register, login, me, updateProfile};
