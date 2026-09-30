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

const findResultWithDetails = async (resultId) => {
  const [resultRows] = await pool.execute(
    `SELECT tr.result_id, tr.user_id, tr.set_id, tr.total_questions, tr.correct_answers, tr.score, tr.created_at,
            s.title AS set_title
     FROM test_results tr
     LEFT JOIN study_sets s ON s.set_id = tr.set_id
     WHERE tr.result_id = ?
     LIMIT 1`,
    [resultId],
  );
  if (!resultRows[0]) return null;
  const res = resultRows[0];

  const [details] = await pool.execute(
    `SELECT detail_id, result_id, card_id, question_order, user_answer, correct_answer, is_correct,
            term, definition, pronunciation, example, audio_url, created_at
     FROM test_result_details
     WHERE result_id = ?
     ORDER BY question_order ASC, detail_id ASC`,
    [resultId],
  );

  const formattedDetails = details.map((d) => ({
    detail_id: Number(d.detail_id),
    result_id: Number(d.result_id),
    card_id: Number(d.card_id),
    question_order: Number(d.question_order),
    user_answer: d.user_answer,
    correct_answer: d.correct_answer,
    is_correct: Boolean(d.is_correct),
    term: d.term,
    definition: d.definition,
    pronunciation: d.pronunciation,
    example: d.example,
    audio_url: d.audio_url,
    created_at: d.created_at,
  }));

  const incorrectCardIds = Array.from(
    new Set(
      formattedDetails
        .filter((d) => !d.is_correct)
        .map((d) => d.card_id),
    ),
  );

  return {
    result_id: Number(res.result_id),
    user_id: Number(res.user_id),
    set_id: Number(res.set_id),
    total_questions: Number(res.total_questions),
    correct_answers: Number(res.correct_answers),
    score: Number(res.score),
    created_at: res.created_at,
    study_set: {
      set_id: Number(res.set_id),
      title: res.set_title || null,
    },
    details: formattedDetails,
    incorrect_card_ids: incorrectCardIds,
  };
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

const createWithDetails = async ({
  userId,
  setId,
  totalQuestions,
  correctAnswers,
  score,
  details = [],
  cardProgressUpdates = [],
}) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert into test_results
    const [result] = await connection.execute(
      `INSERT INTO test_results
        (user_id, set_id, total_questions, correct_answers, score)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, setId, totalQuestions, correctAnswers, score],
    );
    const resultId = result.insertId;

    // 2. Insert into test_result_details
    for (const d of details) {
      await connection.execute(
        `INSERT INTO test_result_details
          (result_id, card_id, question_order, user_answer, correct_answer, is_correct,
           term, definition, pronunciation, example, audio_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          resultId,
          d.card_id,
          d.question_order,
          d.user_answer || null,
          d.correct_answer,
          d.is_correct ? 1 : 0,
          d.term,
          d.definition,
          d.pronunciation || null,
          d.example || null,
          d.audio_url || null,
        ],
      );
    }

    // 3. Update card_progress for each card
    for (const update of cardProgressUpdates) {
      const initialMastery = update.correct ? 1 : 0;
      const initialCorrectCount = update.correct ? 1 : 0;
      const initialWrongCount = update.correct ? 0 : 1;

      await connection.execute(
        `INSERT INTO card_progress
          (user_id, card_id, mastery_level, correct_count, wrong_count, last_reviewed_at, next_review_at)
         VALUES (?, ?, ?, ?, ?, NOW(), ${update.correct ? "DATE_ADD(NOW(), INTERVAL 1 DAY)" : "NOW()"})
         ON DUPLICATE KEY UPDATE
           mastery_level = ${update.correct ? "LEAST(mastery_level + 1, 3)" : "GREATEST(mastery_level - 1, 0)"},
           correct_count = correct_count + ?,
           wrong_count = wrong_count + ?,
           last_reviewed_at = NOW(),
           next_review_at = ${update.correct ? "DATE_ADD(NOW(), INTERVAL 1 DAY)" : "NOW()"}`,
        [
          userId,
          update.cardId,
          initialMastery,
          initialCorrectCount,
          initialWrongCount,
          initialCorrectCount,
          initialWrongCount,
        ],
      );
    }

    await connection.commit();

    return findResultWithDetails(resultId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  create,
  createWithDetails,
  findById,
  findResultWithDetails,
};
