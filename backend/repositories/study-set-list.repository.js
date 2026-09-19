const pool = require("../config/database");

const studySetSelect = `
  SELECT ss.set_id, ss.creator_id, ss.title, ss.description, ss.category,
         ss.language, ss.visibility, ss.status, ss.created_at, ss.updated_at,
         u.username AS creator_username, u.full_name AS creator_full_name,
         COUNT(c.card_id) AS card_count
  FROM study_sets ss
  LEFT JOIN users u ON u.user_id = ss.creator_id
  LEFT JOIN cards c ON c.set_id = ss.set_id`;

const groupBy = `
  GROUP BY ss.set_id, ss.creator_id, ss.title, ss.description, ss.category,
           ss.language, ss.visibility, ss.status, ss.created_at, ss.updated_at,
           u.username, u.full_name`;

const mapStudySet = (studySet) => ({
  ...studySet,
  card_count: Number(studySet.card_count),
});

const findPublic = async (search) => {
  const params = [];
  const conditions = ["ss.visibility = 'PUBLIC'", "ss.status = 'ACTIVE'"];
  if (search) {
    conditions.push(
      "(ss.title LIKE ? OR ss.description LIKE ? OR ss.category LIKE ?)",
    );
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  const [rows] = await pool.execute(
    `${studySetSelect} WHERE ${conditions.join(" AND ")}${groupBy} ORDER BY ss.created_at DESC, ss.set_id DESC`,
    params,
  );
  return rows.map(mapStudySet);
};

const findById = async (setId, includeHidden = false) => {
  const conditions = ["ss.set_id = ?"];
  const params = [setId];
  if (!includeHidden) {
    conditions.push("ss.visibility = 'PUBLIC'", "ss.status = 'ACTIVE'");
  }
  const [rows] = await pool.execute(
    `${studySetSelect} WHERE ${conditions.join(" AND ")}${groupBy} LIMIT 1`,
    params,
  );
  return rows[0] ? mapStudySet(rows[0]) : null;
};

const findByCreatorId = async (creatorId) => {
  const [rows] = await pool.execute(
    `${studySetSelect} WHERE ss.creator_id = ?${groupBy} ORDER BY ss.updated_at DESC, ss.set_id DESC`,
    [creatorId],
  );
  return rows.map(mapStudySet);
};

const create = async ({
  creatorId,
  title,
  description,
  category,
  language,
  visibility,
}) => {
  const [result] = await pool.execute(
    `INSERT INTO study_sets
      (creator_id, title, description, category, language, visibility, status)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [
      creatorId,
      title,
      description || null,
      category || null,
      language || "English",
      visibility || "PUBLIC",
    ],
  );
  return findById(result.insertId, true);
};

const update = async (setId, fields) => {
  const updates = [];
  const params = [];
  if (fields.title !== undefined) {
    updates.push("title = ?");
    params.push(fields.title);
  }
  if (fields.description !== undefined) {
    updates.push("description = ?");
    params.push(fields.description || null);
  }
  if (fields.category !== undefined) {
    updates.push("category = ?");
    params.push(fields.category || null);
  }
  if (fields.language !== undefined) {
    updates.push("language = ?");
    params.push(fields.language || "English");
  }
  if (fields.visibility !== undefined) {
    updates.push("visibility = ?");
    params.push(fields.visibility);
  }

  if (updates.length > 0) {
    params.push(setId);
    await pool.execute(
      `UPDATE study_sets SET ${updates.join(", ")} WHERE set_id = ?`,
      params,
    );
  }
  return findById(setId, true);
};

const remove = async (setId) => {
  const [result] = await pool.execute(
    "DELETE FROM study_sets WHERE set_id = ?",
    [setId],
  );
  return result.affectedRows > 0;
};

module.exports = {findPublic, findById, findByCreatorId, create, update, remove};
