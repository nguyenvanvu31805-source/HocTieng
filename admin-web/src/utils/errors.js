const errorLabels = {
  "Invalid email or password": "Email hoặc mật khẩu không chính xác.",
  "Authentication token is required": "Vui lòng đăng nhập để tiếp tục.",
  "Invalid or expired authentication token":
    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  "You do not have permission to access this resource":
    "Bạn không có quyền truy cập chức năng này.",
  "Study Set not found": "Không tìm thấy bộ học.",
  "Card not found": "Không tìm thấy thẻ từ vựng.",
};

export const getErrorMessage = (error) => {
  const message = error.response?.data?.message || error.message;
  return errorLabels[message] || message || "Đã có lỗi xảy ra.";
};
