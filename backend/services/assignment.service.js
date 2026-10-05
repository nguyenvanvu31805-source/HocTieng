const AppError = require("../utils/appError");
const authRepository = require("../repositories/auth.repository");
const classRepository = require("../repositories/class.repository");
const assignmentRepository = require("../repositories/assignment.repository");
const studySetRepository = require("../repositories/study-set.repository");
const testResultRepository = require("../repositories/test-result.repository");
const studySessionRepository = require("../repositories/study-session.repository");

const ALLOWED_MODES = ["FLASHCARDS", "LEARN", "TEST", "MATCH", "ALL"];

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

const formatSubmission = (submission, assignment) => {
  const isPastDeadline = assignment.deadline ? new Date(assignment.deadline) < new Date() : false;
  let calculatedStatus = "NOT_STARTED";
  if (submission) {
    if (submission.status === "COMPLETED") {
      calculatedStatus = "COMPLETED";
    } else if (isPastDeadline) {
      calculatedStatus = "OVERDUE";
    } else {
      calculatedStatus = submission.status;
    }
  } else {
    calculatedStatus = isPastDeadline ? "OVERDUE" : "NOT_STARTED";
  }

  return {
    assignment_id: assignment.assignment_id,
    submission_id: submission ? Number(submission.submission_id) : null,
    status: calculatedStatus,
    score: submission && submission.score !== null && submission.score !== undefined
      ? Number(submission.score)
      : null,
    started_at: submission ? submission.started_at : null,
    submitted_at: submission ? submission.submitted_at : null,
    result_id: submission && submission.result_id ? Number(submission.result_id) : null,
    session_id: submission && submission.session_id ? Number(submission.session_id) : null,
    deadline: assignment.deadline,
    mode: assignment.mode,
    study_set_title: assignment.study_set_title,
  };
};

const getMySubmission = async (assignmentIdValue, user) => {
  const userId = await requireActiveUser(user);
  const assignmentId = parsePositiveId(assignmentIdValue, "assignmentId");

  const assignment = await assignmentRepository.findById(assignmentId);
  if (!assignment) {
    throw new AppError("Không tìm thấy bài tập.", 404);
  }

  const member = await classRepository.findMember(assignment.class_id, userId);
  if (!member || member.member_role !== "STUDENT") {
    throw new AppError("Bạn không có quyền truy cập bài tập này.", 403);
  }

  const submission = await assignmentRepository.findSubmission(assignmentId, userId);
  return formatSubmission(submission, assignment);
};

const startAssignment = async (assignmentIdValue, user) => {
  const userId = await requireActiveUser(user);
  const assignmentId = parsePositiveId(assignmentIdValue, "assignmentId");

  const assignment = await assignmentRepository.findById(assignmentId);
  if (!assignment) {
    throw new AppError("Không tìm thấy bài tập.", 404);
  }

  const member = await classRepository.findMember(assignment.class_id, userId);
  if (!member || member.member_role !== "STUDENT") {
    throw new AppError("Bạn không có quyền bắt đầu bài tập này.", 403);
  }

  if (assignment.deadline && new Date(assignment.deadline) < new Date()) {
    throw new AppError("Bài tập đã quá hạn nộp, không thể bắt đầu.", 400);
  }

  const existing = await assignmentRepository.findSubmission(assignmentId, userId);
  if (existing) {
    if (existing.status === "COMPLETED") {
      return formatSubmission(existing, assignment);
    }
    if (existing.status === "IN_PROGRESS") {
      return formatSubmission(existing, assignment);
    }
    const updated = await assignmentRepository.updateSubmissionStatus(existing.submission_id, "IN_PROGRESS");
    return formatSubmission(updated, assignment);
  }

  const created = await assignmentRepository.createSubmission({
    assignmentId,
    userId,
    status: "IN_PROGRESS",
    startedAt: new Date(),
  });

  return formatSubmission(created, assignment);
};

const submitAssignment = async (assignmentIdValue, body, user) => {
  const userId = await requireActiveUser(user);
  const assignmentId = parsePositiveId(assignmentIdValue, "assignmentId");

  const assignment = await assignmentRepository.findById(assignmentId);
  if (!assignment) {
    throw new AppError("Không tìm thấy bài tập.", 404);
  }

  const member = await classRepository.findMember(assignment.class_id, userId);
  if (!member || member.member_role !== "STUDENT") {
    throw new AppError("Bạn không có quyền nộp bài tập này.", 403);
  }

  if (assignment.deadline && new Date(assignment.deadline) < new Date()) {
    throw new AppError("Bài tập đã quá hạn nộp, không thể nộp bài.", 400);
  }

  const existing = await assignmentRepository.findSubmission(assignmentId, userId);
  if (existing && existing.status === "COMPLETED") {
    throw new AppError("Bài tập này đã được hoàn thành trước đó.", 400);
  }

  let finalScore = null;
  let finalResultId = null;
  let finalSessionId = null;

  if (assignment.mode === "TEST") {
    if (!body || body.result_id === undefined || body.result_id === null) {
      throw new AppError("result_id là bắt buộc đối với bài tập kiểm tra.", 400);
    }
    const resultId = parsePositiveId(body.result_id, "result_id");
    const testResult = await testResultRepository.findById(resultId);
    if (!testResult) {
      throw new AppError("Không tìm thấy kết quả bài kiểm tra.", 404);
    }
    if (Number(testResult.user_id) !== userId) {
      throw new AppError("Bạn không thể nộp kết quả bài kiểm tra của người khác.", 403);
    }
    if (Number(testResult.set_id) !== Number(assignment.set_id)) {
      throw new AppError("Kết quả bài kiểm tra không thuộc bộ học của bài tập này.", 400);
    }
    finalScore = Number(testResult.score);
    finalResultId = resultId;
  } else if (["LEARN", "FLASHCARDS", "MATCH"].includes(assignment.mode)) {
    if (!body || body.session_id === undefined || body.session_id === null) {
      throw new AppError("session_id là bắt buộc đối với bài tập này.", 400);
    }
    const sessionId = parsePositiveId(body.session_id, "session_id");
    const session = await studySessionRepository.findById(sessionId);
    if (!session) {
      throw new AppError("Không tìm thấy phiên học.", 404);
    }
    if (Number(session.user_id) !== userId) {
      throw new AppError("Bạn không thể nộp phiên học của người khác.", 403);
    }
    if (Number(session.set_id) !== Number(assignment.set_id)) {
      throw new AppError("Phiên học không thuộc bộ học của bài tập này.", 400);
    }
    if (session.mode !== assignment.mode) {
      throw new AppError(
        `Chế độ của phiên học (${session.mode}) không khớp với yêu cầu bài tập (${assignment.mode}).`,
        400,
      );
    }
    finalScore = null;
    finalSessionId = sessionId;
  } else if (assignment.mode === "ALL") {
    if (body && body.result_id !== undefined && body.result_id !== null) {
      const resultId = parsePositiveId(body.result_id, "result_id");
      const testResult = await testResultRepository.findById(resultId);
      if (!testResult) {
        throw new AppError("Không tìm thấy kết quả kiểm tra.", 404);
      }
      if (Number(testResult.user_id) !== userId) {
        throw new AppError("Bạn không thể nộp kết quả của người khác.", 403);
      }
      if (Number(testResult.set_id) !== Number(assignment.set_id)) {
        throw new AppError("Kết quả kiểm tra không thuộc bộ học của bài tập này.", 400);
      }
      finalScore = Number(testResult.score);
      finalResultId = resultId;
    } else if (body && body.session_id !== undefined && body.session_id !== null) {
      const sessionId = parsePositiveId(body.session_id, "session_id");
      const session = await studySessionRepository.findById(sessionId);
      if (!session) {
        throw new AppError("Không tìm thấy phiên học.", 404);
      }
      if (Number(session.user_id) !== userId) {
        throw new AppError("Bạn không thể nộp phiên học của người khác.", 403);
      }
      if (Number(session.set_id) !== Number(assignment.set_id)) {
        throw new AppError("Phiên học không thuộc bộ học của bài tập này.", 400);
      }
      finalScore = null;
      finalSessionId = sessionId;
    } else {
      throw new AppError(
        "Vui lòng cung cấp result_id hoặc session_id để nộp bài tập.",
        400,
      );
    }
  } else {
    throw new AppError("Chế độ bài tập không được hỗ trợ để nộp bài.", 400);
  }

  let submissionRecord;
  if (existing) {
    submissionRecord = await assignmentRepository.updateSubmission({
      submissionId: existing.submission_id,
      status: "COMPLETED",
      score: finalScore,
      resultId: finalResultId,
      sessionId: finalSessionId,
      submittedAt: new Date(),
    });
  } else {
    submissionRecord = await assignmentRepository.createSubmission({
      assignmentId,
      userId,
      status: "COMPLETED",
      score: finalScore,
      resultId: finalResultId,
      sessionId: finalSessionId,
      startedAt: new Date(),
      submittedAt: new Date(),
    });
  }

  return formatSubmission(submissionRecord, assignment);
};

const getGradebook = async (classIdValue, assignmentIdValue, user) => {
  const userId = await requireActiveUser(user);
  const classId = parsePositiveId(classIdValue, "classId");
  const assignmentId = parsePositiveId(assignmentIdValue, "assignmentId");

  const classData = await classRepository.findById(classId);
  if (!classData) {
    throw new AppError("Không tìm thấy lớp học.", 404);
  }

  const isTeacher = Number(classData.teacher_id) === userId;
  const isAdmin = user.role === "ADMIN";
  if (!isTeacher && !isAdmin) {
    throw new AppError("Chỉ giáo viên sở hữu lớp mới có thể xem bảng điểm.", 403);
  }

  const assignment = await assignmentRepository.findById(assignmentId);
  if (!assignment) {
    throw new AppError("Không tìm thấy bài tập.", 404);
  }

  if (Number(assignment.class_id) !== classId) {
    throw new AppError("Bài tập không thuộc lớp học này.", 400);
  }

  const rows = await assignmentRepository.getGradebook(classId, assignmentId);
  const isPastDeadline = assignment.deadline ? new Date(assignment.deadline) < new Date() : false;

  let completedCount = 0;
  let inProgressCount = 0;
  let notStartedCount = 0;
  let overdueCount = 0;
  let scoredSum = 0;
  let scoredCount = 0;

  const students = rows.map((r) => {
    let calculatedStatus = "NOT_STARTED";
    if (r.raw_status === "COMPLETED") {
      calculatedStatus = "COMPLETED";
      completedCount++;
    } else if (isPastDeadline) {
      calculatedStatus = "OVERDUE";
      overdueCount++;
    } else if (r.raw_status === "IN_PROGRESS") {
      calculatedStatus = "IN_PROGRESS";
      inProgressCount++;
    } else {
      calculatedStatus = "NOT_STARTED";
      notStartedCount++;
    }

    const scoreNum = r.score !== null && r.score !== undefined ? Number(r.score) : null;
    if (scoreNum !== null) {
      scoredSum += scoreNum;
      scoredCount++;
    }

    return {
      user_id: Number(r.user_id),
      username: r.username,
      full_name: r.full_name,
      email: r.email,
      avatar_url: r.avatar_url,
      assignment_id: assignment.assignment_id,
      submission_id: r.submission_id ? Number(r.submission_id) : null,
      status: calculatedStatus,
      score: scoreNum,
      started_at: r.started_at,
      submitted_at: r.submitted_at,
      result_id: r.result_id ? Number(r.result_id) : null,
      session_id: r.session_id ? Number(r.session_id) : null,
    };
  });

  const totalStudents = students.length;
  const completionRate = totalStudents > 0
    ? Number(((completedCount / totalStudents) * 100).toFixed(2))
    : 0;
  const averageScore = scoredCount > 0
    ? Number((scoredSum / scoredCount).toFixed(2))
    : null;

  return {
    assignment: {
      assignment_id: assignment.assignment_id,
      class_id: assignment.class_id,
      title: assignment.title,
      mode: assignment.mode,
      deadline: assignment.deadline,
      set_id: assignment.set_id,
      study_set_title: assignment.study_set_title,
    },
    summary: {
      total_students: totalStudents,
      completed_count: completedCount,
      in_progress_count: inProgressCount,
      not_started_count: notStartedCount,
      overdue_count: overdueCount,
      completion_rate: completionRate,
      average_score: averageScore,
    },
    students,
  };
};

module.exports = {
  createAssignment,
  getClassAssignments,
  getAssignmentDetail,
  updateAssignment,
  deleteAssignment,
  getMySubmission,
  startAssignment,
  submitAssignment,
  getGradebook,
};
