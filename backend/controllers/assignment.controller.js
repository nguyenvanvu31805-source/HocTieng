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

module.exports = {
  createAssignment,
  getClassAssignments,
  getAssignmentDetail,
  updateAssignment,
  deleteAssignment,
};
