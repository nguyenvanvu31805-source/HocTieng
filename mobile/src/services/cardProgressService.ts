import api from '@/services/api';
import { CardProgressRecord, StudySetProgress } from '@/types/cardProgress';

export const cardProgressService = {
  /**
   * Lấy toàn bộ tiến độ của người dùng trong một Study Set.
   * Endpoint: GET /progress/study-sets/:setId
   */
  async getStudySetProgress(setId: string | number): Promise<StudySetProgress | null> {
    try {
      const response = await api.get<StudySetProgress>(`/progress/study-sets/${setId}`);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch {
      // Khi chưa đăng nhập (401) hoặc lỗi mạng, trả về null an toàn
      return null;
    }
  },

  /**
   * Ghi nhận lượt học/ôn tập cho một thẻ (review card).
   * Endpoint: POST /progress/cards/:cardId/review
   * Body: { correct: boolean }
   */
  async reviewCard(cardId: number, correct: boolean = true): Promise<CardProgressRecord | null> {
    try {
      const response = await api.post<CardProgressRecord>(`/progress/cards/${cardId}/review`, {
        correct,
      });
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch {
      // Xử lý background async an toàn, không gián đoạn giao diện người dùng
      return null;
    }
  },
};

export default cardProgressService;
