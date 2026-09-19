const AppError = require("../utils/appError");
const authRepository = require("../repositories/auth.repository");
const classRepository = require("../repositories/class.repository");
const assignmentRepository = require("../repositories/assignment.repository");
const studySetRepository = require("../repositories/study-set.repository");

const ALLOWED_MODES = ["FLASHCARDS", "LEARN", "TEST", "MATCH"];

const parsePositiveId = (value, fieldName) => {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1) {
    throw new AppError(`${fieldName} must be a positive integer`, 400);
  }
  return Number(value);
};

const getUserId = (user) => user && Number(user.user_id);

const requireActiveUser = async (user) => {
  const userId = getUserId(user);
  if (!userId) throw new AppError("Authentication token is required", 401);

  const currentUser = await authRepository.findById(userId);
  if (!currentUser) throw new AppError("User not found", 401);
  if (currentUser.status !== "ACTIVE") {
    throw new AppError("This account is not active", 403);
  }

  return userId;
};

const canUseStudySet = (studySet, userId, role) => {
  if (role === "ADMIN") return true;
  if (!studySet || studySet.status === "DELETED") return false;
  if (studySet.visibility === "PUBLIC" && studySet.status === "ACTIVE") {
    return true;
  }
  return Number(studySet.creator_id) === userId;
};

const createAssignment = async (
  classIdValue,
  {set_id, title, description, mode, deadline},
  user,
) => {
  const userId = await requireActiveUser(user);
  const classId = parsePositiveId(classIdValue, "classId");

  const classData = await classRepository.findById(classId);
  if (!classData) {
    throw new AppError("Không tìm thấy lớp.", 404);
  }

  const isTeacher = Number(classData.teacher_id) === userId;
  const isAdmin = user.role === "ADMIN";

  if (!isTeacher && !isAdmin) {
    throw new AppError("Chỉ giáo viên sở hữu lớp mới có thể giao bài tập.", 403);
  }

  if (!title || !title.trim()) {
    throw new AppError("Tiêu đề bài tập không được để trống.", 400);
  }

  if (!mode || !ALLOWED_MODES.includes(mode)) {
    throw new AppError(
      `Chế độ học không hợp lệ. Chỉ chấp nhận: ${ALLOWED_MODES.join(", ")}.`,
      400,
    );
  }

  const setId = parsePositiveId(set_id, "set_id");
  const studySet = await studySetRepository.findById(setId);
  if (!studySet) {
    throw new AppError("Không tìm thấy bộ học.", 404);
  }

  if (!canUseStudySet(studySet, userId, user.role)) {
    throw new AppError("Bạn không có quyền sử dụng bộ học này để giao bài.", 403);
  }

  let formattedDeadline = null;
  if (deadline) {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) {
      throw new AppError("Hạn hoàn thành (deadline) không hợp lệ.", 400);
    }
    // format as YYYY-MM-DD HH:mm:ss
    formattedDeadline = d.toISOString().slice(0, 19).replace("T", " ");
  }

  return assignmentRepository.createAssignment({
    classId,
    setId,
    title: title.trim(),
    description: description ? description.trim() : null,
    mode,
    deadline: formattedDeadline,
  });
};

const getClassAssignments = async (classIdValue, user) => {
  const userId = await requireActiveUser(user);
  const classId = parsePositiveId(classIdValue, "classId");

  const classData = await classRepository.findById(classId);
  if (!classData) {
    throw new AppError("Không tìm thấy lớp.", 404);
  }

  const isTeacher = Number(classData.teacher_id) === userId;
  const isAdmin = user.role === "ADMIN";
  const member = await classRepository.findMember(classId, userId);

  if (!isTeacher && !isAdmin && !member) {
    throw new AppError("Bạn không có quyền xem bài tập của lớp này.", 403);
  }

  return assignmentRepository.findByClassId(classId);
};

const getAssignmentDetail = async (assignmentIdValue, user) => {
  const userId = await requireActiveUser(user);
  const assignmentId = parsePositiveId(assignmentIdValue, "assignmentId");

  const assignment = await assignmentRepository.findById(assignmentId);
  if (!assignment) {
    throw new AppError("Không tìm thấy bài tập.", 404);
  }

  const isTeacher = Number(assignment.teacher_id) === userId;
  const isAdmin = user.role === "ADMIN";
  const member = await classRepository.findMember(assignment.class_id, userId);

  if (!isTeacher && !isAdmin && !member) {
    throw new AppError("Bạn không có quyền truy cập bài tập này.", 403);
  }

  return assignment;
};

const updateAssignment = async (
  assignmentIdValue,
  {title, description, mode, deadline},
  user,
) => {
  const userId = await requireActiveUser(user);
  const assignmentId = parsePositiveId(assignmentIdValue, "assignmentId");

  const assignment = await assignmentRepository.findById(assignmentId);
  if (!assignment) {
    throw new AppError("Không tìm thấy bài tập.", 404);
  }

  const isTeacher = Number(assignment.teacher_id) === userId;
  const isAdmin = user.role === "ADMIN";

  if (!isTeacher && !isAdmin) {
    throw new AppError("Chỉ giáo viên sở hữu lớp mới có thể sửa bài tập.", 403);
  }

  const updateData = {};
  if (title !== undefined) {
    if (!title || !title.trim()) {
      throw new AppError("Tiêu đề bài tập không được để trống.", 400);
    }
    updateData.title = title.trim();
  } else {
    updateData.title = assignment.title;
  }

  if (description !== undefined) {
    updateData.description = description ? description.trim() : null;
  } else {
    updateData.description = assignment.description;
  }

  if (mode !== undefined) {
    if (!ALLOWED_MODES.includes(mode)) {
      throw new AppError(
        `Chế độ học không hợp lệ. Chỉ chấp nhận: ${ALLOWED_MODES.join(", ")}.`,
        400,
      );
    }
    updateData.mode = mode;
  } else {
    updateData.mode = assignment.mode;
  }

  if (deadline !== undefined) {
    if (deadline === null || deadline === "") {
      updateData.deadline = null;
    } else {
      const d = new Date(deadline);
      if (isNaN(d.getTime())) {
        throw new AppError("Hạn hoàn thành (deadline) không hợp lệ.", 400);
      }
      updateData.deadline = d.toISOString().slice(0, 19).replace("T", " ");
    }
  } else {
    updateData.deadline = assignment.deadline;
  }

  return assignmentRepository.updateAssignment(assignmentId, updateData);
};

const deleteAssignment = async (assignmentIdValue, user) => {
  const userId = await requireActiveUser(user);
  const assignmentId = parsePositiveId(assignmentIdValue, "assignmentId");

  const assignment = await assignmentRepository.findById(assignmentId);
  if (!assignment) {
    throw new AppError("Không tìm thấy bài tập.", 404);
  }

  const isTeacher = Number(assignment.teacher_id) === userId;
  const isAdmin = user.role === "ADMIN";

  if (!isTeacher && !isAdmin) {
    throw new AppError("Chỉ giáo viên sở hữu lớp mới có thể xóa bài tập.", 403);
  }

  await assignmentRepository.deleteAssignment(assignmentId);
  return {message: "Đã xóa bài tập thành công."};
};

module.exports = {
  createAssignment,
  getClassAssignments,
  getAssignmentDetail,
  updateAssignment,
  deleteAssignment,
};
