import api from '@/services/api';
import {
  Assignment,
  AssignmentDetail,
  CreateAssignmentPayload,
} from '@/types/assignment';

export const assignmentService = {
  /**
   * Lấy danh sách bài tập của một lớp học
   * Endpoint: GET /classes/:classId/assignments
   */
  async getClassAssignments(classId: string | number): Promise<Assignment[]> {
    const response = await api.get<Assignment[]>(`/classes/${classId}/assignments`);
    if (response.success && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  /**
   * Lấy thông tin chi tiết một bài tập
   * Endpoint: GET /assignments/:assignmentId
   */
  async getAssignmentDetail(assignmentId: string | number): Promise<AssignmentDetail> {
    const response = await api.get<AssignmentDetail>(`/assignments/${assignmentId}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Không thể tải thông tin bài tập.');
  },

  /**
   * Giáo viên tạo bài tập mới cho lớp
   * Endpoint: POST /classes/:classId/assignments
   */
  async createAssignment(
    classId: string | number,
    payload: CreateAssignmentPayload,
  ): Promise<AssignmentDetail> {
    const response = await api.post<AssignmentDetail>(
      `/classes/${classId}/assignments`,
      payload,
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Không thể tạo bài tập.');
  },

  /**
   * Giáo viên xóa bài tập
   * Endpoint: DELETE /assignments/:assignmentId
   */
  async deleteAssignment(assignmentId: string | number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/assignments/${assignmentId}`);
    return {
      message: response.data?.message || response.message || 'Đã xóa bài tập thành công.',
    };
  },
};

export default assignmentService;
