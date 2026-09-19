const AppError = require("../utils/appError");
const studySetRepository = require("../repositories/study-set-list.repository");
const adminRepository = require("../repositories/admin.repository");

const parseSetId = (value) => {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1) {
    throw new AppError("setId must be a positive integer", 400);
  }
  return Number(value);
};

const canSeeAll = (user) => user?.role === "ADMIN";

const getStudySets = ({search, status, user}) =>
  canSeeAll(user)
    ? adminRepository.findStudySets({search: search?.trim(), status})
    : studySetRepository.findPublic(search?.trim());

const getMyStudySets = async (userId) => {
  if (!userId) throw new AppError("User not found", 401);
  return studySetRepository.findByCreatorId(Number(userId));
};

const getStudySet = async (setIdValue, user) => {
  const setId = parseSetId(setIdValue);
  let studySet = await studySetRepository.findById(setId, canSeeAll(user));
  if (!studySet && user?.user_id) {
    const ownedSets = await studySetRepository.findByCreatorId(
      Number(user.user_id),
    );
    studySet = ownedSets.find((item) => item.set_id === setId) || null;
  }
  if (!studySet) throw new AppError("Study Set not found", 404);
  return studySet;
};

const updateStatus = async (setIdValue, status) => {
  const setId = parseSetId(setIdValue);
  if (!["ACTIVE", "HIDDEN"].includes(status)) {
    throw new AppError("status must be ACTIVE or HIDDEN", 400);
  }
  const studySet = await studySetRepository.findById(setId, true);
  if (!studySet) throw new AppError("Study Set not found", 404);
  await adminRepository.updateStatus(setId, status);
  return studySetRepository.findById(setId, true);
};

const createStudySet = async (user, data) => {
  if (!user || !user.user_id) throw new AppError("Authentication required", 401);

  const title = data.title?.trim();
  if (!title) throw new AppError("title is required", 400);
  if (title.length > 255) {
    throw new AppError("title must not exceed 255 characters", 400);
  }

  const visibility = data.visibility
    ? String(data.visibility).toUpperCase()
    : "PUBLIC";
  if (!["PUBLIC", "PRIVATE"].includes(visibility)) {
    throw new AppError("visibility must be PUBLIC or PRIVATE", 400);
  }

  const description = data.description ? String(data.description).trim() : null;
  const category = data.category ? String(data.category).trim() : null;
  const language = data.language ? String(data.language).trim() : "English";

  return studySetRepository.create({
    creatorId: Number(user.user_id),
    title,
    description,
    category,
    language,
    visibility,
  });
};

const updateStudySet = async (setIdValue, user, data) => {
  if (!user || !user.user_id) throw new AppError("Authentication required", 401);

  const setId = parseSetId(setIdValue);
  const studySet = await studySetRepository.findById(setId, true);
  if (!studySet) throw new AppError("Study Set not found", 404);

  const isCreator = Number(studySet.creator_id) === Number(user.user_id);
  const isAdminUser = user.role === "ADMIN";
  if (!isCreator && !isAdminUser) {
    throw new AppError(
      "Only the Study Set creator or ADMIN can edit this Study Set",
      403,
    );
  }

  const fields = {};
  if (data.title !== undefined) {
    const title = data.title?.trim();
    if (!title) throw new AppError("title cannot be empty", 400);
    if (title.length > 255) {
      throw new AppError("title must not exceed 255 characters", 400);
    }
    fields.title = title;
  }
  if (data.description !== undefined) {
    fields.description = data.description ? String(data.description).trim() : null;
  }
  if (data.category !== undefined) {
    fields.category = data.category ? String(data.category).trim() : null;
  }
  if (data.language !== undefined) {
    fields.language = data.language ? String(data.language).trim() : "English";
  }
  if (data.visibility !== undefined) {
    const visibility = String(data.visibility).toUpperCase();
    if (!["PUBLIC", "PRIVATE"].includes(visibility)) {
      throw new AppError("visibility must be PUBLIC or PRIVATE", 400);
    }
    fields.visibility = visibility;
  }

  return studySetRepository.update(setId, fields);
};

const deleteStudySet = async (setIdValue, user) => {
  const setId = parseSetId(setIdValue);
  const studySet = await studySetRepository.findById(setId, true);
  if (!studySet) throw new AppError("Study Set not found", 404);

  if (user) {
    const isCreator = Number(studySet.creator_id) === Number(user.user_id);
    const isAdminUser = user.role === "ADMIN";
    if (!isCreator && !isAdminUser) {
      throw new AppError(
        "Only the Study Set creator or ADMIN can delete this Study Set",
        403,
      );
    }
  }

  await adminRepository.removeStudySet(setId);
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
