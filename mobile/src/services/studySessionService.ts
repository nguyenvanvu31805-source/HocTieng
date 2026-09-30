import api from '@/services/api';
import {
  StudySession,
  StudyStats,
  StartSessionParams,
  CompleteSessionParams,
} from '@/types/studySession';

export const studySessionService = {
  /**
   * Khởi tạo phiên học mới.
   * Endpoint: POST /study-sessions
   */
  async startSession(params: StartSessionParams): Promise<StudySession | null> {
    try {
      const response = await api.post<StudySession>('/study-sessions', params);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch {
      // Fallback an toàn nếu lỗi mạng hoặc unauthenticated
      return null;
    }
  },

  /**
   * Hoàn thành phiên học.
   * Endpoint: PATCH /study-sessions/:sessionId/complete
   */
  async completeSession(
    sessionId: number,
    params: CompleteSessionParams = {}
  ): Promise<StudySession | null> {
    try {
      const response = await api.patch<StudySession>(
        `/study-sessions/${sessionId}/complete`,
        params
      );
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Lấy thống kê streak và tiến trình học tập của user hiện tại.
   * Endpoint: GET /study-sessions/stats
   */
  async getStudyStats(): Promise<StudyStats | null> {
    try {
      const response = await api.get<StudyStats>('/study-sessions/stats');
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },
};

export default studySessionService;
