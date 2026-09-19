const progressService = require("../services/progress.service");
const {success} = require("../utils/response");

const getStudySetProgress = async (req, res) => {
  const progress = await progressService.getProgressByStudySet(
    req.params.setId,
    req.user,
  );
  return success(res, progress, "Progress retrieved successfully");
};

const reviewCard = async (req, res) => {
  const progress = await progressService.reviewCard(
    req.params.cardId,
    req.user,
    req.body,
  );
  return success(res, progress, "Card progress updated successfully");
};

module.exports = {getStudySetProgress, reviewCard};
