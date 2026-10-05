const assignmentService = require("../services/assignment.service");
const {success} = require("../utils/response");

const createAssignment = async (req, res) => {
  const result = await assignmentService.createAssignment(
    req.params.classId,
    req.body,
    req.user,
  );
  return success(res, result, "Giao bài tập thành công.", 201);
};

const getClassAssignments = async (req, res) => {
  const result = await assignmentService.getClassAssignments(
    req.params.classId,
    req.user,
  );
  return success(res, result, "Lấy danh sách bài tập thành công.");
};

const getAssignmentDetail = async (req, res) => {
  const result = await assignmentService.getAssignmentDetail(
    req.params.assignmentId,
    req.user,
  );
  return success(res, result, "Lấy chi tiết bài tập thành công.");
};

const updateAssignment = async (req, res) => {
  const result = await assignmentService.updateAssignment(
    req.params.assignmentId,
    req.body,
    req.user,
  );
  return success(res, result, "Cập nhật bài tập thành công.");
};

const deleteAssignment = async (req, res) => {
  const result = await assignmentService.deleteAssignment(
    req.params.assignmentId,
    req.user,
  );
  return success(res, result, result.message);
};

const getMySubmission = async (req, res) => {
  const result = await assignmentService.getMySubmission(
    req.params.assignmentId,
    req.user,
  );
  return success(res, result, "Lấy thông tin bài nộp thành công.");
};

const startAssignment = async (req, res) => {
  const result = await assignmentService.startAssignment(
    req.params.assignmentId,
    req.user,
  );
  return success(res, result, "Bắt đầu làm bài tập thành công.");
};

const submitAssignment = async (req, res) => {
  const result = await assignmentService.submitAssignment(
    req.params.assignmentId,
    req.body,
    req.user,
  );
  return success(res, result, "Nộp bài tập thành công.");
};

const getGradebook = async (req, res) => {
  const result = await assignmentService.getGradebook(
    req.params.classId,
    req.params.assignmentId,
    req.user,
  );
  return success(res, result, "Lấy bảng điểm bài tập thành công.");
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
