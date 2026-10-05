const pool = require("../config/database");

const createClass = async ({teacherId, name, description, joinCode}) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO classes (teacher_id, name, description, join_code, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [teacherId, name, description || null, joinCode],
    );

    const classId = result.insertId;

    // Add teacher as class member with TEACHER role
    await connection.execute(
      `INSERT INTO class_members (class_id, user_id, member_role, joined_at)
       VALUES (?, ?, 'TEACHER', NOW())`,
      [classId, teacherId],
    );

    await connection.commit();

    return {
      class_id: classId,
      teacher_id: teacherId,
      name,
      description: description || null,
      join_code: joinCode,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const findById = async (classId) => {
  const [rows] = await pool.execute(
    `SELECT c.class_id, c.teacher_id, c.name, c.description, c.join_code, c.created_at, c.updated_at,
            u.username AS teacher_username, u.full_name AS teacher_full_name, u.avatar_url AS teacher_avatar_url,
            COUNT(DISTINCT cm.user_id) AS member_count,
            COUNT(DISTINCT a.assignment_id) AS assignment_count
     FROM classes c
     LEFT JOIN users u ON u.user_id = c.teacher_id
     LEFT JOIN class_members cm ON cm.class_id = c.class_id
     LEFT JOIN assignments a ON a.class_id = c.class_id
     WHERE c.class_id = ?
     GROUP BY c.class_id, c.teacher_id, c.name, c.description, c.join_code, c.created_at, c.updated_at,
              u.username, u.full_name, u.avatar_url
     LIMIT 1`,
    [classId],
  );

  if (!rows[0]) return null;

  return {
    ...rows[0],
    member_count: Number(rows[0].member_count),
    assignment_count: Number(rows[0].assignment_count),
  };
};

const findByJoinCode = async (joinCode) => {
  const [rows] = await pool.execute(
    `SELECT c.class_id, c.teacher_id, c.name, c.description, c.join_code, c.created_at, c.updated_at,
            u.username AS teacher_username, u.full_name AS teacher_full_name
     FROM classes c
     LEFT JOIN users u ON u.user_id = c.teacher_id
     WHERE c.join_code = ?
     LIMIT 1`,
    [joinCode],
  );
  return rows[0] || null;
};

const findClassesByTeacher = async (teacherId) => {
  const [rows] = await pool.execute(
    `SELECT c.class_id, c.teacher_id, c.name, c.description, c.join_code, c.created_at, c.updated_at,
            u.username AS teacher_username, u.full_name AS teacher_full_name,
            COUNT(DISTINCT cm.user_id) AS member_count,
            COUNT(DISTINCT a.assignment_id) AS assignment_count
     FROM classes c
     LEFT JOIN users u ON u.user_id = c.teacher_id
     LEFT JOIN class_members cm ON cm.class_id = c.class_id
     LEFT JOIN assignments a ON a.class_id = c.class_id
     WHERE c.teacher_id = ?
     GROUP BY c.class_id, c.teacher_id, c.name, c.description, c.join_code, c.created_at, c.updated_at,
              u.username, u.full_name
     ORDER BY c.created_at DESC`,
    [teacherId],
  );

  return rows.map((r) => ({
    ...r,
    member_count: Number(r.member_count),
    assignment_count: Number(r.assignment_count),
  }));
};

const findClassesByStudent = async (studentId) => {
  const [rows] = await pool.execute(
    `SELECT c.class_id, c.teacher_id, c.name, c.description, c.created_at, c.updated_at,
            cm.joined_at, cm.member_role,
            u.username AS teacher_username, u.full_name AS teacher_full_name,
            (SELECT COUNT(1) FROM class_members WHERE class_id = c.class_id) AS member_count,
            (SELECT COUNT(1) FROM assignments WHERE class_id = c.class_id) AS assignment_count
     FROM class_members cm
     INNER JOIN classes c ON c.class_id = cm.class_id
     LEFT JOIN users u ON u.user_id = c.teacher_id
     WHERE cm.user_id = ? AND cm.member_role = 'STUDENT'
     ORDER BY cm.joined_at DESC`,
    [studentId],
  );

  return rows.map((r) => ({
    ...r,
    member_count: Number(r.member_count),
    assignment_count: Number(r.assignment_count),
  }));
};

const updateClass = async (classId, {name, description}) => {
  await pool.execute(
    `UPDATE classes
     SET name = ?, description = ?, updated_at = NOW()
     WHERE class_id = ?`,
    [name, description || null, classId],
  );
  return findById(classId);
};

const findMember = async (classId, userId) => {
  const [rows] = await pool.execute(
    `SELECT class_id, user_id, member_role, joined_at
     FROM class_members
     WHERE class_id = ? AND user_id = ?
     LIMIT 1`,
    [classId, userId],
  );
  return rows[0] || null;
};

const addMember = async ({classId, userId, memberRole = "STUDENT"}) => {
  await pool.execute(
    `INSERT INTO class_members (class_id, user_id, member_role, joined_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE member_role = VALUES(member_role)`,
    [classId, userId, memberRole],
  );
  return findMember(classId, userId);
};

const removeMember = async (classId, userId) => {
  const [result] = await pool.execute(
    `DELETE FROM class_members WHERE class_id = ? AND user_id = ?`,
    [classId, userId],
  );
  return result.affectedRows > 0;
};

const getClassMembers = async (classId) => {
  const [rows] = await pool.execute(
    `SELECT cm.class_id, cm.user_id, cm.member_role, cm.joined_at,
            u.username, u.full_name, u.avatar_url, u.email
     FROM class_members cm
     INNER JOIN users u ON u.user_id = cm.user_id
     WHERE cm.class_id = ?
     ORDER BY CASE WHEN cm.member_role = 'TEACHER' THEN 0 ELSE 1 END ASC, cm.joined_at ASC`,
    [classId],
  );
  return rows;
};

module.exports = {
  createClass,
  findById,
  findByJoinCode,
  findClassesByTeacher,
  findClassesByStudent,
  updateClass,
  findMember,
  addMember,
  removeMember,
  getClassMembers,
};
