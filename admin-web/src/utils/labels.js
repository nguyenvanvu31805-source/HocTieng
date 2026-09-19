export const roleLabels = {
  ADMIN: "Quản trị viên",
  TEACHER: "Giáo viên",
  STUDENT: "Học viên",
};

export const userStatusLabels = {
  ACTIVE: "Đang hoạt động",
  LOCKED: "Đã khóa",
  BANNED: "Bị cấm",
};

export const studySetVisibilityLabels = {
  PUBLIC: "Công khai",
  PRIVATE: "Riêng tư",
};

export const studySetStatusLabels = {
  ACTIVE: "Đang hoạt động",
  HIDDEN: "Đã ẩn",
  DELETED: "Đã xóa",
};

export const getLabel = (labels, value) => labels[value] || value || "—";
