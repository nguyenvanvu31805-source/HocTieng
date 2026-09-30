const pool = require("../config/database");

const cardColumns =
  "card_id, set_id, term, definition, pronunciation, example, image_url, audio_url, position, created_at, updated_at";

const findBySetId = async (setId) => {
  const [rows] = await pool.execute(
    `SELECT ${cardColumns}
     FROM cards
     WHERE set_id = ?
     ORDER BY position ASC, card_id ASC`,
    [setId],
  );
  return rows;
};

const findById = async (cardId) => {
  const [rows] = await pool.execute(
    `SELECT ${cardColumns}
     FROM cards
     WHERE card_id = ?
     LIMIT 1`,
    [cardId],
  );
  return rows[0] || null;
};

const findNextPosition = async (setId) => {
  const [rows] = await pool.execute(
    "SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM cards WHERE set_id = ?",
    [setId],
  );
  return Number(rows[0].next_position);
};

const create = async ({
  setId,
  term,
  definition,
  pronunciation,
  example,
  imageUrl,
  audioUrl,
  position,
}) => {
  const cardPosition = position ?? (await findNextPosition(setId));
  const [result] = await pool.execute(
    `INSERT INTO cards
      (set_id, term, definition, pronunciation, example, image_url, audio_url, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      setId,
      term,
      definition,
      pronunciation || null,
      example || null,
      imageUrl || null,
      audioUrl || null,
      cardPosition,
    ],
  );
  return findById(result.insertId);
};

const update = async (
  cardId,
  {term, definition, pronunciation, example, imageUrl, audioUrl, position},
) => {
  await pool.execute(
    `UPDATE cards
     SET term = ?, definition = ?, pronunciation = ?, example = ?,
         image_url = ?, audio_url = ?, position = COALESCE(?, position)
     WHERE card_id = ?`,
    [
      term,
      definition,
      pronunciation || null,
      example || null,
      imageUrl || null,
      audioUrl || null,
      position ?? null,
      cardId,
    ],
  );
  return findById(cardId);
};

const remove = async (cardId) => {
  const [result] = await pool.execute("DELETE FROM cards WHERE card_id = ?", [
    cardId,
  ]);
  return result.affectedRows > 0;
};

const findBySetIdAndFilter = async ({ setId, userId, filter }) => {
  if (!filter || filter === "all") {
    return findBySetId(setId);
  }

  const columns = `c.card_id, c.set_id, c.term, c.definition, c.pronunciation, c.example, c.image_url, c.audio_url, c.position, c.created_at, c.updated_at`;

  if (filter === "unlearned") {
    const [rows] = await pool.execute(
      `SELECT ${columns}
       FROM cards c
       LEFT JOIN card_progress cp ON cp.card_id = c.card_id AND cp.user_id = ?
       WHERE c.set_id = ?
         AND (cp.progress_id IS NULL OR cp.last_reviewed_at IS NULL OR (cp.mastery_level = 0 AND cp.correct_count = 0 AND cp.wrong_count = 0))
       ORDER BY c.position ASC, c.card_id ASC`,
      [userId, setId],
    );
    return rows;
  }

  if (filter === "weak") {
    const [rows] = await pool.execute(
      `SELECT ${columns}
       FROM cards c
       INNER JOIN card_progress cp ON cp.card_id = c.card_id AND cp.user_id = ?
       WHERE c.set_id = ?
         AND (cp.wrong_count > cp.correct_count OR (cp.wrong_count > 0 AND cp.mastery_level <= 1))
       ORDER BY c.position ASC, c.card_id ASC`,
      [userId, setId],
    );
    return rows;
  }

  if (filter === "review") {
    const [rows] = await pool.execute(
      `SELECT ${columns}
       FROM cards c
       INNER JOIN card_progress cp ON cp.card_id = c.card_id AND cp.user_id = ?
       WHERE c.set_id = ?
         AND cp.next_review_at IS NOT NULL
         AND cp.next_review_at <= NOW()
       ORDER BY c.position ASC, c.card_id ASC`,
      [userId, setId],
    );
    return rows;
  }

  if (filter === "mastered") {
    const [rows] = await pool.execute(
      `SELECT ${columns}
       FROM cards c
       INNER JOIN card_progress cp ON cp.card_id = c.card_id AND cp.user_id = ?
       WHERE c.set_id = ?
         AND cp.mastery_level >= 3
       ORDER BY c.position ASC, c.card_id ASC`,
      [userId, setId],
    );
    return rows;
  }

  return findBySetId(setId);
};

const countByFilters = async (setId, userId) => {
  if (!userId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(card_id) AS total FROM cards WHERE set_id = ?`,
      [setId],
    );
    const total = Number(rows[0]?.total || 0);
    return {
      all: total,
      unlearned: total,
      weak: 0,
      review: 0,
      mastered: 0,
      learning: 0,
    };
  }

  const [rows] = await pool.execute(
    `SELECT 
       COUNT(c.card_id) AS total,
       SUM(CASE WHEN cp.progress_id IS NULL OR cp.last_reviewed_at IS NULL OR (cp.mastery_level = 0 AND cp.correct_count = 0 AND cp.wrong_count = 0) THEN 1 ELSE 0 END) AS unlearned,
       SUM(CASE WHEN cp.progress_id IS NOT NULL AND (cp.wrong_count > cp.correct_count OR (cp.wrong_count > 0 AND cp.mastery_level <= 1)) THEN 1 ELSE 0 END) AS weak,
       SUM(CASE WHEN cp.progress_id IS NOT NULL AND cp.next_review_at IS NOT NULL AND cp.next_review_at <= NOW() THEN 1 ELSE 0 END) AS review,
       SUM(CASE WHEN cp.progress_id IS NOT NULL AND cp.mastery_level >= 3 THEN 1 ELSE 0 END) AS mastered,
       SUM(CASE WHEN cp.progress_id IS NOT NULL AND cp.mastery_level IN (1, 2) THEN 1 ELSE 0 END) AS learning
     FROM cards c
     LEFT JOIN card_progress cp ON cp.card_id = c.card_id AND cp.user_id = ?
     WHERE c.set_id = ?`,
    [userId, setId],
  );

  const row = rows[0] || {};
  return {
    all: Number(row.total || 0),
    unlearned: Number(row.unlearned || 0),
    weak: Number(row.weak || 0),
    review: Number(row.review || 0),
    mastered: Number(row.mastered || 0),
    learning: Number(row.learning || 0),
  };
};

module.exports = {
  findBySetId,
  findBySetIdAndFilter,
  countByFilters,
  findById,
  findNextPosition,
  create,
  update,
  remove,
};
