const pool = require("../config/database");

const findByEmail = async (email) => {
  const [rows] = await pool.execute(
    "SELECT user_id, username, email, password_hash, full_name, avatar_url, role, status FROM users WHERE email = ? LIMIT 1",
    [email],
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

const create = async ({username, email, passwordHash, fullName}) => {
  const [result] = await pool.execute(
    `INSERT INTO users (username, email, password_hash, full_name, role, status)
     VALUES (?, ?, ?, ?, 'STUDENT', 'ACTIVE')`,
    [username, email, passwordHash, fullName || null],
  );
  return result.insertId;
};

module.exports = {findByEmail, findByUsername, create};
