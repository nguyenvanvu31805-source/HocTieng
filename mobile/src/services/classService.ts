import api from '@/services/api';
import {
  ClassItem,
  ClassDetail,
  ClassMember,
  JoinClassResponse,
  CreateClassPayload,
} from '@/types/class';

export const classService = {
  /**
   * Lấy danh sách lớp học của người dùng hiện tại (Giáo viên xem lớp mình dạy, Học sinh xem lớp mình tham gia)
   * Endpoint: GET /classes
   */
  async getMyClasses(): Promise<ClassItem[]> {
    const response = await api.get<ClassItem[]>('/classes');
    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  /**
   * Lấy thông tin chi tiết một lớp học
   * Endpoint: GET /classes/:classId
   */
  async getClassDetail(classId: string | number): Promise<ClassDetail> {
    const response = await api.get<ClassDetail>(`/classes/${classId}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Không thể tải thông tin lớp học.');
  },

  /**
   * Tham gia lớp học bằng mã tham gia (join_code)
   * Endpoint: POST /classes/join
   */
  async joinClass(joinCode: string): Promise<JoinClassResponse> {
    const cleanCode = joinCode.trim().toUpperCase();
    const response = await api.post<JoinClassResponse>('/classes/join', {
      join_code: cleanCode,
    });
    if (response.success && response.data) {
      return response.data;
    }
    return {
      class_id: response.data?.class_id || 0,
      message: response.message || 'Tham gia lớp thành công!',
      already_member: Boolean(response.data?.already_member),
    };
  },

  /**
   * Lấy danh sách thành viên trong lớp học
   * Endpoint: GET /classes/:classId/members
   */
  async getClassMembers(classId: string | number): Promise<ClassMember[]> {
    const response = await api.get<ClassMember[]>(`/classes/${classId}/members`);
    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  /**
   * Học sinh rời khỏi lớp học
   * Endpoint: DELETE /classes/:classId/members/me
   */
  async leaveClass(classId: string | number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/classes/${classId}/members/me`);
    return {
      message: response.data?.message || response.message || 'Đã rời lớp học thành công.',
    };
  },

  /**
   * Tạo lớp học mới (dành cho Giáo viên hoặc Admin)
   * Endpoint: POST /classes
   */
  async createClass(payload: CreateClassPayload): Promise<ClassDetail> {
    const response = await api.post<ClassDetail>('/classes', payload);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Không thể tạo lớp học.');
  },

  /**
   * Cập nhật thông tin lớp học (dành cho Giáo viên chủ lớp)
   * Endpoint: PATCH /classes/:classId
   */
  async updateClass(
    classId: string | number,
    payload: { name: string; description?: string | null }
  ): Promise<ClassDetail> {
    const response = await api.patch<ClassDetail>(`/classes/${classId}`, payload);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Không thể cập nhật lớp học.');
  },

  /**
   * Giáo viên xóa học sinh khỏi lớp
   * Endpoint: DELETE /classes/:classId/members/:userId
   */
  async removeMember(
    classId: string | number,
    userId: string | number
  ): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(
      `/classes/${classId}/members/${userId}`
    );
    return {
      message: response.data?.message || response.message || 'Đã xóa học viên khỏi lớp thành công.',
    };
  },
};

export default classService;
