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

const findSubmission = async (assignmentId, userId) => {
  const [rows] = await pool.execute(
    `SELECT submission_id, assignment_id, user_id, status, score,
            result_id, session_id, started_at, submitted_at, created_at, updated_at
     FROM assignment_submissions
     WHERE assignment_id = ? AND user_id = ?
     LIMIT 1`,
    [assignmentId, userId],
  );
  return rows[0] || null;
};

const findSubmissionById = async (submissionId) => {
  const [rows] = await pool.execute(
    `SELECT submission_id, assignment_id, user_id, status, score,
            result_id, session_id, started_at, submitted_at, created_at, updated_at
     FROM assignment_submissions
     WHERE submission_id = ?
     LIMIT 1`,
    [submissionId],
  );
  return rows[0] || null;
};

const createSubmission = async ({
  assignmentId,
  userId,
  status = "IN_PROGRESS",
  score = null,
  resultId = null,
  sessionId = null,
  startedAt = null,
  submittedAt = null,
}) => {
  const [result] = await pool.execute(
    `INSERT INTO assignment_submissions (
       assignment_id, user_id, status, score, result_id, session_id, started_at, submitted_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), ?, NOW(), NOW())`,
    [
      assignmentId,
      userId,
      status,
      score !== null && score !== undefined ? score : null,
      resultId || null,
      sessionId || null,
      startedAt || null,
      submittedAt || null,
    ],
  );
  return findSubmissionById(result.insertId);
};

const updateSubmission = async ({
  submissionId,
  status,
  score = null,
  resultId = null,
  sessionId = null,
  submittedAt = null,
}) => {
  await pool.execute(
    `UPDATE assignment_submissions
     SET status = ?, score = ?, result_id = ?, session_id = ?,
         submitted_at = COALESCE(?, NOW()), updated_at = NOW()
     WHERE submission_id = ?`,
    [
      status,
      score !== null && score !== undefined ? score : null,
      resultId || null,
      sessionId || null,
      submittedAt || null,
      submissionId,
    ],
  );
  return findSubmissionById(submissionId);
};

const updateSubmissionStatus = async (submissionId, status) => {
  await pool.execute(
    `UPDATE assignment_submissions
     SET status = ?, updated_at = NOW()
     WHERE submission_id = ?`,
    [status, submissionId],
  );
  return findSubmissionById(submissionId);
};

const getGradebook = async (classId, assignmentId) => {
  const [rows] = await pool.execute(
    `SELECT 
       cm.user_id,
       u.username,
       u.full_name,
       u.email,
       u.avatar_url,
       sub.submission_id,
       sub.status AS raw_status,
       sub.score,
       sub.started_at,
       sub.submitted_at,
       sub.result_id,
       sub.session_id
     FROM class_members cm
     INNER JOIN users u ON u.user_id = cm.user_id
     LEFT JOIN assignment_submissions sub 
       ON sub.user_id = cm.user_id AND sub.assignment_id = ?
     WHERE cm.class_id = ? AND cm.member_role = 'STUDENT'
     ORDER BY u.full_name ASC, u.username ASC`,
    [assignmentId, classId],
  );
  return rows;
};

module.exports = {
  createAssignment,
  findById,
  findByClassId,
  updateAssignment,
  deleteAssignment,
  findSubmission,
  findSubmissionById,
  createSubmission,
  updateSubmission,
  updateSubmissionStatus,
  getGradebook,
};
