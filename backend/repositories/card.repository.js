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

module.exports = {
  findBySetId,
  findById,
  findNextPosition,
  create,
  update,
  remove,
};
