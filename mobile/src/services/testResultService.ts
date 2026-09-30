import api from '@/services/api';
import { CreateTestResultPayload, TestResult } from '@/types/testResult';

export const testResultService = {
  /**
   * Lưu kết quả bài kiểm tra lên backend
   * Endpoint: POST /test-results
   * Body: { set_id, details: [...] }
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

  /**
   * Lấy chi tiết kết quả bài kiểm tra từ backend
   * Endpoint: GET /test-results/:resultId
   */
  async getTestResult(resultId: number | string): Promise<TestResult | null> {
    try {
      const response = await api.get<TestResult>(`/test-results/${resultId}`);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.warn('Lỗi khi tải chi tiết bài kiểm tra:', error);
      throw error;
    }
  },
};

export default testResultService;
