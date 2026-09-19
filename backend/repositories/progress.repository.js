const pool = require("../config/database");

const progressColumns =
  "progress_id, user_id, card_id, mastery_level, correct_count, wrong_count, last_reviewed_at, next_review_at, created_at, updated_at";

const findByUserAndStudySet = async (userId, setId) => {
  const [rows] = await pool.execute(
    `SELECT cp.${progressColumns.split(", ").join(", cp.")}
     FROM card_progress cp
     INNER JOIN cards c ON c.card_id = cp.card_id
     WHERE cp.user_id = ? AND c.set_id = ?
     ORDER BY c.position ASC, c.card_id ASC`,
    [userId, setId],
  );
  return rows;
};

const findByUserAndCard = async (userId, cardId) => {
  const [rows] = await pool.execute(
    `SELECT ${progressColumns}
     FROM card_progress
     WHERE user_id = ? AND card_id = ?
     LIMIT 1`,
    [userId, cardId],
  );
  return rows[0] || null;
};

const saveReview = async ({userId, cardId, correct}) => {
  const initialMastery = correct ? 1 : 0;
  const initialCorrectCount = correct ? 1 : 0;
  const initialWrongCount = correct ? 0 : 1;

  await pool.execute(
    `INSERT INTO card_progress
      (user_id, card_id, mastery_level, correct_count, wrong_count, last_reviewed_at, next_review_at)
     VALUES (?, ?, ?, ?, ?, NOW(), ${correct ? "DATE_ADD(NOW(), INTERVAL 1 DAY)" : "NOW()"})
     ON DUPLICATE KEY UPDATE
       mastery_level = ${correct ? "LEAST(mastery_level + 1, 3)" : "GREATEST(mastery_level - 1, 0)"},
       correct_count = correct_count + ?,
       wrong_count = wrong_count + ?,
       last_reviewed_at = NOW(),
       next_review_at = ${correct ? "DATE_ADD(NOW(), INTERVAL 1 DAY)" : "NOW()"}`,
    [
      userId,
      cardId,
      initialMastery,
      initialCorrectCount,
      initialWrongCount,
      initialCorrectCount,
      initialWrongCount,
    ],
  );

  return findByUserAndCard(userId, cardId);
};

module.exports = {
  findByUserAndStudySet,
  findByUserAndCard,
  saveReview,
};
