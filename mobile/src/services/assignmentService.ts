import api from '@/services/api';
import {
  Assignment,
  AssignmentDetail,
  AssignmentSubmission,
  CreateAssignmentPayload,
  GradebookData,
  SubmitAssignmentPayload,
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

  /**
   * Học sinh xem thông tin nộp bài của chính mình
   * Endpoint: GET /assignments/:assignmentId/my-submission
   */
  async getMySubmission(assignmentId: string | number): Promise<AssignmentSubmission> {
    const response = await api.get<AssignmentSubmission>(
      `/assignments/${assignmentId}/my-submission`,
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Không thể lấy thông tin bài nộp.');
  },

  /**
   * Học sinh bắt đầu làm bài tập
   * Endpoint: POST /assignments/:assignmentId/start
   */
  async startAssignment(assignmentId: string | number): Promise<AssignmentSubmission> {
    const response = await api.post<AssignmentSubmission>(
      `/assignments/${assignmentId}/start`,
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Không thể bắt đầu bài tập.');
  },

  /**
   * Học sinh nộp bài tập
   * Endpoint: POST /assignments/:assignmentId/submit
   */
  async submitAssignment(
    assignmentId: string | number,
    payload: SubmitAssignmentPayload,
  ): Promise<AssignmentSubmission> {
    const response = await api.post<AssignmentSubmission>(
      `/assignments/${assignmentId}/submit`,
      payload,
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Không thể nộp bài tập.');
  },

  /**
   * Giáo viên xem bảng điểm bài tập của lớp
   * Endpoint: GET /classes/:classId/assignments/:assignmentId/gradebook
   */
  async getGradebook(
    classId: string | number,
    assignmentId: string | number,
  ): Promise<GradebookData> {
    const response = await api.get<GradebookData>(
      `/classes/${classId}/assignments/${assignmentId}/gradebook`,
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Không thể tải bảng điểm.');
  },
};

export default assignmentService;
