import api from '@/services/api';
import { CreateTestResultPayload, TestResult } from '@/types/testResult';

export const testResultService = {
  /**
   * Lưu kết quả bài kiểm tra lên backend
   * Endpoint: POST /test-results
   * Body: { set_id, total_questions, correct_answers, score }
   */
  async submitTestResult(payload: CreateTestResultPayload): Promise<TestResult | null> {
    try {
      const response = await api.post<TestResult>('/test-results', payload);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.warn('Lỗi khi lưu kết quả bài kiểm tra:', error);
      throw error;
    }
  },
};

export default testResultService;
