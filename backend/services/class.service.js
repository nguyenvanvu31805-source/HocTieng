const crypto = require("crypto");
const AppError = require("../utils/appError");
const authRepository = require("../repositories/auth.repository");
const classRepository = require("../repositories/class.repository");

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

const generateJoinCode = async () => {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // excludes 0, O, 1, I
  for (let attempt = 0; attempt < 5; attempt++) {
    let code = "";
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += charset[bytes[i] % charset.length];
    }
    const existing = await classRepository.findByJoinCode(code);
    if (!existing) return code;
  }
  return `ENG${Date.now().toString().slice(-4)}`;
};

const createClass = async ({name, description}, user) => {
  const userId = await requireActiveUser(user);

  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    throw new AppError("Chỉ giáo viên mới có thể tạo lớp học.", 403);
  }

  if (!name || !name.trim()) {
    throw new AppError("Tên lớp học không được để trống.", 400);
  }

  const joinCode = await generateJoinCode();
  const newClass = await classRepository.createClass({
    teacherId: userId,
    name: name.trim(),
    description: description ? description.trim() : null,
    joinCode,
  });

  return newClass;
};

const getMyClasses = async (user) => {
  const userId = await requireActiveUser(user);

  if (user.role === "TEACHER") {
    return classRepository.findClassesByTeacher(userId);
  }

  if (user.role === "STUDENT") {
    return classRepository.findClassesByStudent(userId);
  }

  // ADMIN can view classes they created or manage
  return classRepository.findClassesByTeacher(userId);
};

const getClassDetail = async (classIdValue, user) => {
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
    throw new AppError("Bạn không có quyền truy cập lớp này.", 403);
  }

  return {
    ...classData,
    is_teacher: isTeacher || isAdmin,
    is_member: Boolean(member),
    member_role: member ? member.member_role : isTeacher ? "TEACHER" : null,
  };
};

const updateClass = async (classIdValue, {name, description}, user) => {
  const userId = await requireActiveUser(user);
  const classId = parsePositiveId(classIdValue, "classId");

  const existingClass = await classRepository.findById(classId);
  if (!existingClass) {
    throw new AppError("Không tìm thấy lớp.", 404);
  }

  const isTeacher = Number(existingClass.teacher_id) === userId;
  const isAdmin = user.role === "ADMIN";

  if (!isTeacher && !isAdmin) {
    throw new AppError("Chỉ giáo viên sở hữu lớp mới có thể sửa thông tin lớp.", 403);
  }

  if (!name || !name.trim()) {
    throw new AppError("Tên lớp học không được để trống.", 400);
  }

  return classRepository.updateClass(classId, {
    name: name.trim(),
    description: description ? description.trim() : null,
  });
};

const joinClass = async ({join_code}, user) => {
  const userId = await requireActiveUser(user);

  if (!join_code || !String(join_code).trim()) {
    throw new AppError("Vui lòng nhập mã tham gia.", 400);
  }

  const cleanCode = String(join_code).trim().toUpperCase();
  const targetClass = await classRepository.findByJoinCode(cleanCode);

  if (!targetClass) {
    throw new AppError("Mã tham gia không tồn tại.", 404);
  }

  const classId = targetClass.class_id;

  // Check if user is teacher of this class
  if (Number(targetClass.teacher_id) === userId) {
    return {
      class_id: classId,
      message: "Bạn là giáo viên sở hữu lớp này.",
      already_member: true,
    };
  }

  // Check if user is already a member
  const existingMember = await classRepository.findMember(classId, userId);
  if (existingMember) {
    return {
      class_id: classId,
      message: "Bạn đã tham gia lớp này.",
      already_member: true,
    };
  }

  await classRepository.addMember({
    classId,
    userId,
    memberRole: "STUDENT",
  });

  return {
    class_id: classId,
    message: "Bạn đã tham gia lớp thành công!",
    already_member: false,
  };
};

const getClassMembers = async (classIdValue, user) => {
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
    throw new AppError("Bạn không có quyền xem thành viên của lớp này.", 403);
  }

  return classRepository.getClassMembers(classId);
};

const leaveClass = async (classIdValue, user) => {
  const userId = await requireActiveUser(user);
  const classId = parsePositiveId(classIdValue, "classId");

  const classData = await classRepository.findById(classId);
  if (!classData) {
    throw new AppError("Không tìm thấy lớp.", 404);
  }

  if (Number(classData.teacher_id) === userId) {
    throw new AppError("Giáo viên không thể rời lớp do mình làm chủ.", 400);
  }

  const member = await classRepository.findMember(classId, userId);
  if (!member) {
    throw new AppError("Bạn chưa tham gia lớp này.", 400);
  }

  await classRepository.removeMember(classId, userId);
  return {message: "Đã rời lớp học thành công."};
};

const removeMember = async (classIdValue, targetUserIdValue, user) => {
  const userId = await requireActiveUser(user);
  const classId = parsePositiveId(classIdValue, "classId");
  const targetUserId = parsePositiveId(targetUserIdValue, "userId");

  const classData = await classRepository.findById(classId);
  if (!classData) {
    throw new AppError("Không tìm thấy lớp.", 404);
  }

  const isTeacher = Number(classData.teacher_id) === userId;
  const isAdmin = user.role === "ADMIN";

  if (!isTeacher && !isAdmin) {
    throw new AppError(
      "Chỉ giáo viên sở hữu lớp mới có thể xóa thành viên khỏi lớp.",
      403,
    );
  }

  if (targetUserId === Number(classData.teacher_id)) {
    throw new AppError("Không thể xóa giáo viên chủ nhiệm khỏi lớp.", 400);
  }

  const member = await classRepository.findMember(classId, targetUserId);
  if (!member) {
    throw new AppError("Học viên không tồn tại trong lớp học này.", 404);
  }

  await classRepository.removeMember(classId, targetUserId);
  return {message: "Đã xóa học viên khỏi lớp thành công."};
};

module.exports = {
  createClass,
  getMyClasses,
  getClassDetail,
  updateClass,
  joinClass,
  getClassMembers,
  leaveClass,
  removeMember,
};
