export const getErrorMessage = (error) =>
  error.response?.status === 401
    ? "Vui lòng đăng nhập để tiếp tục."
    : error.response?.status === 403
      ? "Bạn không có quyền thực hiện thao tác này."
      : error.response?.status === 404
        ? "Không tìm thấy dữ liệu."
        : error.response?.status >= 500
          ? "Có lỗi xảy ra trên máy chủ."
          : error.response?.data?.message || error.message || "Đã xảy ra lỗi.";
