const pool = require("../config/database");

const resultColumns =
  "result_id, user_id, set_id, total_questions, correct_answers, score, created_at";

const findById = async (resultId) => {
  const [rows] = await pool.execute(
    `SELECT ${resultColumns}
     FROM test_results
     WHERE result_id = ?
     LIMIT 1`,
    [resultId],
  );
  return rows[0] || null;
};

const create = async ({userId, setId, totalQuestions, correctAnswers, score}) => {
  const [result] = await pool.execute(
    `INSERT INTO test_results
      (user_id, set_id, total_questions, correct_answers, score)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, setId, totalQuestions, correctAnswers, score],
  );
  return findById(result.insertId);
};

module.exports = {create, findById};
