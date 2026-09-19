const studySetService = require("../services/study-set.service");
const {success} = require("../utils/response");

const getStudySets = async (req, res) =>
  success(
    res,
    await studySetService.getStudySets({
      search: req.query.search,
      status: req.query.status,
      user: req.user,
    }),
    "Study Sets retrieved successfully",
  );

const getStudySet = async (req, res) =>
  success(
    res,
    await studySetService.getStudySet(req.params.id, req.user),
    "Study Set retrieved successfully",
  );

const getMyStudySets = async (req, res) =>
  success(
    res,
    await studySetService.getMyStudySets(req.user.user_id),
    "My Study Sets retrieved successfully",
  );

const updateStatus = async (req, res) =>
  success(
    res,
    await studySetService.updateStatus(req.params.id, req.body.status),
    "Study Set status updated successfully",
  );

const createStudySet = async (req, res) => {
  const studySet = await studySetService.createStudySet(req.user, req.body);
  return success(res, studySet, "Study Set created successfully", 201);
};

const updateStudySet = async (req, res) => {
  const studySet = await studySetService.updateStudySet(
    req.params.id,
    req.user,
    req.body,
  );
  return success(res, studySet, "Study Set updated successfully");
};

const deleteStudySet = async (req, res) => {
  await studySetService.deleteStudySet(req.params.id, req.user);
  return success(res, null, "Study Set deleted successfully");
};

module.exports = {
  getStudySets,
  getMyStudySets,
  getStudySet,
  createStudySet,
  updateStudySet,
  updateStatus,
  deleteStudySet,
};
