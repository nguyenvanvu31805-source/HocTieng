const classService = require("../services/class.service");
const {success} = require("../utils/response");

const createClass = async (req, res) => {
  const result = await classService.createClass(req.body, req.user);
  return success(res, result, "Tạo lớp học thành công.", 201);
};

const getMyClasses = async (req, res) => {
  const result = await classService.getMyClasses(req.user);
  return success(res, result, "Lấy danh sách lớp học thành công.");
};

const getClassDetail = async (req, res) => {
  const result = await classService.getClassDetail(req.params.classId, req.user);
  return success(res, result, "Lấy thông tin lớp học thành công.");
};

const updateClass = async (req, res) => {
  const result = await classService.updateClass(
    req.params.classId,
    req.body,
    req.user,
  );
  return success(res, result, "Cập nhật thông tin lớp học thành công.");
};

const joinClass = async (req, res) => {
  const result = await classService.joinClass(req.body, req.user);
  return success(res, result, result.message);
};

const getClassMembers = async (req, res) => {
  const result = await classService.getClassMembers(
    req.params.classId,
    req.user,
  );
  return success(res, result, "Lấy danh sách thành viên thành công.");
};

const leaveClass = async (req, res) => {
  const result = await classService.leaveClass(req.params.classId, req.user);
  return success(res, result, result.message);
};

module.exports = {
  createClass,
  getMyClasses,
  getClassDetail,
  updateClass,
  joinClass,
  getClassMembers,
  leaveClass,
};
