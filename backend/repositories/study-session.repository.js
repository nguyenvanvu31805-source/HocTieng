const pool = require("../config/database");

const createSession = async ({userId, setId = null, mode, startedAt = null}) => {
  const query = `
    INSERT INTO study_sessions (user_id, set_id, mode, started_at)
    VALUES (?, ?, ?, COALESCE(?, NOW()))
  `;
  const [result] = await pool.execute(query, [
    userId,
    setId !== undefined && setId !== null ? setId : null,
    mode,
    startedAt || null,
  ]);
  return findById(result.insertId);
};

const findById = async (sessionId) => {
  const query = `
    SELECT 
      session_id,
      user_id,
      set_id,
      mode,
      started_at,
      ended_at,
      score,
      cards_studied,
      CASE 
        WHEN ended_at IS NOT NULL THEN GREATEST(0, TIMESTAMPDIFF(SECOND, started_at, ended_at))
        ELSE 0 
      END AS duration_seconds
    FROM study_sessions
    WHERE session_id = ?
  `;
  const [rows] = await pool.execute(query, [sessionId]);
  return rows[0] || null;
};

const updateCompletion = async (sessionId, {endedAt = null, score = null, cardsStudied = 0}) => {
  const query = `
    UPDATE study_sessions
    SET 
      ended_at = COALESCE(?, NOW()),
      score = ?,
      cards_studied = ?
    WHERE session_id = ?
  `;
  await pool.execute(query, [
    endedAt || null,
    score !== undefined && score !== null ? score : null,
    cardsStudied !== undefined && cardsStudied !== null ? cardsStudied : 0,
    sessionId,
  ]);
  return findById(sessionId);
};

const getCompletedSessionsByUser = async (userId) => {
  const query = `
    SELECT 
      session_id,
      user_id,
      set_id,
      mode,
      started_at,
      ended_at,
      score,
      cards_studied,
      GREATEST(0, TIMESTAMPDIFF(SECOND, started_at, ended_at)) AS duration_seconds,
      DATE_FORMAT(ended_at, '%Y-%m-%d') AS study_date
    FROM study_sessions
    WHERE user_id = ? AND ended_at IS NOT NULL
    ORDER BY ended_at DESC
  `;
  const [rows] = await pool.execute(query, [userId]);
  return rows;
};

const getDbTodayDate = async () => {
  const [rows] = await pool.query(
    "SELECT DATE_FORMAT(NOW(), '%Y-%m-%d') AS today_str"
  );
  return rows[0]?.today_str || new Date().toISOString().slice(0, 10);
};

module.exports = {
  createSession,
  findById,
  updateCompletion,
  getCompletedSessionsByUser,
  getDbTodayDate,
};
