const pool = require("../config/database");

const findById = async (setId) => {
  const [rows] = await pool.execute(
    `SELECT set_id, creator_id, title, visibility, status
     FROM study_sets
     WHERE set_id = ?
     LIMIT 1`,
    [setId],
  );
  return rows[0] || null;
};

module.exports = {findById};
