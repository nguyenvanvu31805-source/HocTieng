const pool = require("../config/database");

const userColumns = `user_id, username, email, full_name, avatar_url, role,
                     status, created_at, updated_at`;

const findUsers = async ({search, role, status} = {}) => {
  const conditions = [];
  const params = [];
  if (search) {
    conditions.push("(username LIKE ? OR email LIKE ? OR full_name LIKE ?)");
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (role) {
    conditions.push("role = ?");
    params.push(role);
  }
  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }
  const [rows] = await pool.execute(
    `SELECT ${userColumns}
     FROM users
     ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
     ORDER BY created_at DESC, user_id DESC`,
    params,
  );
  return rows;
};

const findUserById = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT ${userColumns} FROM users WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
};

const updateUserStatus = async (userId, status) => {
  const [result] = await pool.execute(
    "UPDATE users SET status = ? WHERE user_id = ?",
    [status, userId],
  );
  return result.affectedRows > 0;
};

const findStudySets = async ({search, status} = {}) => {
  const conditions = [];
  const params = [];
  if (search) {
    conditions.push(
      "(ss.title LIKE ? OR ss.description LIKE ? OR ss.category LIKE ?)",
    );
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (status) {
    conditions.push("ss.status = ?");
    params.push(status);
  }
  const [rows] = await pool.execute(
    `SELECT ss.set_id, ss.creator_id, ss.title, ss.description, ss.category,
            ss.language, ss.visibility, ss.status, ss.created_at, ss.updated_at,
            u.username AS creator_username, u.full_name AS creator_full_name,
            COUNT(c.card_id) AS card_count
     FROM study_sets ss
     LEFT JOIN users u ON u.user_id = ss.creator_id
     LEFT JOIN cards c ON c.set_id = ss.set_id
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      GROUP BY ss.set_id, ss.creator_id, ss.title, ss.description, ss.category,
              ss.language, ss.visibility, ss.status, ss.created_at, ss.updated_at,
              u.username, u.full_name
     ORDER BY ss.created_at DESC, ss.set_id DESC`,
    params,
  );
  return rows.map((studySet) => ({
    ...studySet,
    card_count: Number(studySet.card_count),
  }));
};

const updateStatus = async (setId, status) => {
  const [result] = await pool.execute(
    "UPDATE study_sets SET status = ? WHERE set_id = ?",
    [status, setId],
  );
  return result.affectedRows > 0;
};

const removeStudySet = async (setId) => {
  const [result] = await pool.execute(
    "DELETE FROM study_sets WHERE set_id = ?",
    [setId],
  );
  return result.affectedRows > 0;
};

const getDashboardStats = async () => {
  const [rows] = await pool.execute(
    `SELECT
       (SELECT COUNT(*) FROM users) AS total_users,
       (SELECT COUNT(*) FROM study_sets) AS total_study_sets,
       (SELECT COUNT(*) FROM cards) AS total_cards,
       (SELECT COUNT(*) FROM study_sessions) AS total_study_sessions,
       (SELECT COUNT(*) FROM test_results) AS total_test_results`,
  );
  return Object.fromEntries(
    Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]),
  );
};

module.exports = {
  findUsers,
  findUserById,
  updateUserStatus,
  findStudySets,
  updateStatus,
  removeStudySet,
  getDashboardStats,
};
