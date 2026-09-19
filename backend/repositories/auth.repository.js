const pool = require("../config/database");

const userColumns =
  "user_id, username, email, password_hash, full_name, avatar_url, role, status, created_at, updated_at";

const findByIdentifier = async (identifier) => {
  const [rows] = await pool.execute(
    `SELECT ${userColumns}
     FROM users
     WHERE email = ? OR username = ?
     LIMIT 1`,
    [identifier, identifier],
  );
  return rows[0] || null;
};

const findById = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT ${userColumns}
     FROM users
     WHERE user_id = ?
     LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
};

const findByUsername = async (username) => {
  const [rows] = await pool.execute(
    "SELECT user_id FROM users WHERE username = ? LIMIT 1",
    [username],
  );
  return rows[0] || null;
};

const findByEmail = async (email) => {
  const [rows] = await pool.execute(
    "SELECT user_id FROM users WHERE email = ? LIMIT 1",
    [email],
  );
  return rows[0] || null;
};

const create = async ({username, email, passwordHash, fullName}) => {
  const [result] = await pool.execute(
    `INSERT INTO users
      (username, email, password_hash, full_name, role, status)
     VALUES (?, ?, ?, ?, 'STUDENT', 'ACTIVE')`,
    [username, email, passwordHash, fullName || null],
  );
  return result.insertId;
};

const updateProfile = async (userId, {fullName, avatarUrl}) => {
  await pool.execute(
    "UPDATE users SET full_name = ?, avatar_url = ? WHERE user_id = ?",
    [fullName || null, avatarUrl || null, userId],
  );
  return findById(userId);
};

module.exports = {
  findByIdentifier,
  findById,
  findByUsername,
  findByEmail,
  create,
  updateProfile,
};
