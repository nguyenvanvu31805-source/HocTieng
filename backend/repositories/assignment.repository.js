const pool = require("../config/database");

const createAssignment = async ({
  classId,
  setId,
  title,
  description,
  mode,
  deadline,
}) => {
  const [result] = await pool.execute(
    `INSERT INTO assignments (class_id, set_id, title, description, mode, deadline, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [classId, setId, title, description || null, mode, deadline || null],
  );

  return findById(result.insertId);
};

const findById = async (assignmentId) => {
  const [rows] = await pool.execute(
    `SELECT a.assignment_id, a.class_id, a.set_id, a.title, a.description, a.mode, a.deadline,
            a.created_at, a.updated_at,
            c.name AS class_name, c.teacher_id,
            ss.title AS study_set_title, ss.description AS study_set_description,
            COUNT(DISTINCT cd.card_id) AS card_count
     FROM assignments a
     INNER JOIN classes c ON c.class_id = a.class_id
     INNER JOIN study_sets ss ON ss.set_id = a.set_id
     LEFT JOIN cards cd ON cd.set_id = ss.set_id
     WHERE a.assignment_id = ?
     GROUP BY a.assignment_id, a.class_id, a.set_id, a.title, a.description, a.mode, a.deadline,
              a.created_at, a.updated_at, c.name, c.teacher_id, ss.title, ss.description
     LIMIT 1`,
    [assignmentId],
  );

  if (!rows[0]) return null;

  return {
    ...rows[0],
    card_count: Number(rows[0].card_count),
  };
};

const findByClassId = async (classId) => {
  const [rows] = await pool.execute(
    `SELECT a.assignment_id, a.class_id, a.set_id, a.title, a.description, a.mode, a.deadline,
            a.created_at, a.updated_at,
            ss.title AS study_set_title,
            COUNT(DISTINCT cd.card_id) AS card_count
     FROM assignments a
     INNER JOIN study_sets ss ON ss.set_id = a.set_id
     LEFT JOIN cards cd ON cd.set_id = ss.set_id
     WHERE a.class_id = ?
     GROUP BY a.assignment_id, a.class_id, a.set_id, a.title, a.description, a.mode, a.deadline,
              a.created_at, a.updated_at, ss.title
     ORDER BY a.created_at DESC`,
    [classId],
  );

  return rows.map((r) => ({
    ...r,
    card_count: Number(r.card_count),
  }));
};

const updateAssignment = async (
  assignmentId,
  {title, description, mode, deadline},
) => {
  await pool.execute(
    `UPDATE assignments
     SET title = ?, description = ?, mode = ?, deadline = ?, updated_at = NOW()
     WHERE assignment_id = ?`,
    [title, description || null, mode, deadline || null, assignmentId],
  );

  return findById(assignmentId);
};

const deleteAssignment = async (assignmentId) => {
  const [result] = await pool.execute(
    `DELETE FROM assignments WHERE assignment_id = ?`,
    [assignmentId],
  );
  return result.affectedRows > 0;
};

module.exports = {
  createAssignment,
  findById,
  findByClassId,
  updateAssignment,
  deleteAssignment,
};
