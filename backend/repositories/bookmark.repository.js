const pool = require("../config/database");

const findByUserAndSet = async (userId, setId) => {
  const [rows] = await pool.execute(
    "SELECT user_id, set_id, created_at FROM bookmarks WHERE user_id = ? AND set_id = ? LIMIT 1",
    [userId, setId],
  );
  return rows[0] || null;
};

const create = async (userId, setId) => {
  await pool.execute(
    `INSERT INTO bookmarks (user_id, set_id, created_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE created_at = NOW()`,
    [userId, setId],
  );
  return true;
};

const remove = async (userId, setId) => {
  const [result] = await pool.execute(
    "DELETE FROM bookmarks WHERE user_id = ? AND set_id = ?",
    [userId, setId],
  );
  return result.affectedRows > 0;
};

const findUserBookmarks = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT ss.set_id, ss.creator_id, ss.title, ss.description, ss.category,
            ss.language, ss.visibility, ss.status, ss.created_at, ss.updated_at,
            b.created_at AS bookmarked_at,
            u.username AS creator_username, u.full_name AS creator_full_name,
            COUNT(c.card_id) AS card_count
     FROM bookmarks b
     INNER JOIN study_sets ss ON ss.set_id = b.set_id
     LEFT JOIN users u ON u.user_id = ss.creator_id
     LEFT JOIN cards c ON c.set_id = ss.set_id
     WHERE b.user_id = ? AND ss.status = 'ACTIVE'
     GROUP BY ss.set_id, ss.creator_id, ss.title, ss.description, ss.category,
              ss.language, ss.visibility, ss.status, ss.created_at, ss.updated_at,
              b.created_at, u.username, u.full_name
     ORDER BY b.created_at DESC`,
    [userId],
  );
  return rows.map((row) => ({
    ...row,
    card_count: Number(row.card_count),
  }));
};

module.exports = {
  findByUserAndSet,
  create,
  remove,
  findUserBookmarks,
};
