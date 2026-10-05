import api from '@/services/api';
import {
  StudySession,
  StudySessionItem,
  StudyStats,
  StartSessionParams,
  CompleteSessionParams,
  GetSessionsParams,
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

  /**
   * Lấy danh sách lịch sử các phiên học của user hiện tại.
   * Endpoint: GET /study-sessions?mode=...&page=...&limit=...
   */
  async getSessions(params?: GetSessionsParams): Promise<StudySessionItem[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.mode && params.mode !== 'ALL') {
        searchParams.append('mode', params.mode);
      }
      if (params?.page) {
        searchParams.append('page', String(params.page));
      }
      if (params?.limit) {
        searchParams.append('limit', String(params.limit));
      }

      const queryString = searchParams.toString();
      const endpoint = queryString ? `/study-sessions?${queryString}` : '/study-sessions';

      const response = await api.get<StudySessionItem[]>(endpoint);
      if (response.success && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Lấy thông tin chi tiết một phiên học theo ID.
   * Endpoint: GET /study-sessions/:sessionId
   */
  async getSessionDetail(sessionId: number): Promise<StudySessionItem | null> {
    try {
      const response = await api.get<StudySessionItem>(`/study-sessions/${sessionId}`);
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
