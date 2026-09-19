const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authRepository = require("../repositories/auth.repository");
const AppError = require("../utils/appError");
const {jwtSecret, jwtExpiresIn} = require("../config/env");

const createToken = (user) =>
  jwt.sign(
    {user_id: user.user_id, username: user.username, role: user.role},
    jwtSecret,
    {expiresIn: jwtExpiresIn},
  );

const withoutPassword = (user) => {
  const {password_hash: ignoredPassword, ...safeUser} = user;
  return safeUser;
};

const register = async ({username, email, password, full_name, fullName}) => {
  if (!username || !email || !password) {
    throw new AppError("username, email and password are required", 400);
  }
  if (password.length < 6)
    throw new AppError("Password must be at least 6 characters", 400);
  if (await authRepository.findByUsername(username)) {
    throw new AppError("Username is already in use", 409);
  }
  if (await authRepository.findByEmail(email))
    throw new AppError("Email is already in use", 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = await authRepository.create({
    username,
    email,
    passwordHash,
    fullName: full_name || fullName,
  });
  const user = await authRepository.findById(userId);
  return withoutPassword(user);
};

const login = async ({identifier, email, username, password}) => {
  const loginIdentifier = identifier || email || username;
  if (!loginIdentifier || !password)
    throw new AppError("email or username and password are required", 400);
  const user = await authRepository.findByIdentifier(loginIdentifier);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AppError("Invalid email or password", 401);
  }
  if (user.status !== "ACTIVE")
    throw new AppError("This account is not active", 403);

  return {token: createToken(user), user: withoutPassword(user)};
};

const getCurrentUser = async (userId) => {
  const user = await authRepository.findById(userId);
  if (!user) throw new AppError("User not found", 404);
  return withoutPassword(user);
};

const updateProfile = async (userId, {full_name, avatar_url}) => {
  const user = await authRepository.updateProfile(userId, {
    fullName: full_name,
    avatarUrl: avatar_url,
  });
  if (!user) throw new AppError("User not found", 404);
  return withoutPassword(user);
};

module.exports = {register, login, getCurrentUser, updateProfile};
