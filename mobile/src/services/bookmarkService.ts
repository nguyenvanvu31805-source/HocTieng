import api from '@/services/api';
import { StudySet } from '@/types/studySet';

export interface BookmarkStatusResponse {
  bookmarked: boolean;
}

export const bookmarkService = {
  /**
   * Lấy danh sách tất cả các bộ học đã bookmark của người dùng hiện tại
   * Endpoint: GET /bookmarks
   */
  async getBookmarks(): Promise<StudySet[]> {
    try {
      const response = await api.get<StudySet[]>('/bookmarks');
      if (response.success && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.warn('Lỗi khi tải danh sách bookmark:', error);
      return [];
    }
  },

  /**
   * Kiểm tra trạng thái bookmark của một bộ học
   * Endpoint: GET /bookmarks/:setId
   */
  async getBookmarkStatus(setId: string | number): Promise<boolean> {
    try {
      const response = await api.get<BookmarkStatusResponse>(`/bookmarks/${setId}`);
      if (response.success && response.data) {
        return Boolean(response.data.bookmarked);
      }
      return false;
    } catch {
      return false;
    }
  },

  /**
   * Lưu bộ học vào danh sách bookmark
   * Endpoint: POST /bookmarks/:setId
   */
  async addBookmark(setId: string | number): Promise<boolean> {
    const response = await api.post<BookmarkStatusResponse>(`/bookmarks/${setId}`);
    if (response.success && response.data) {
      return Boolean(response.data.bookmarked);
    }
    return true;
  },

  /**
   * Xóa bộ học khỏi danh sách bookmark
   * Endpoint: DELETE /bookmarks/:setId
   */
  async removeBookmark(setId: string | number): Promise<boolean> {
    const response = await api.delete<BookmarkStatusResponse>(`/bookmarks/${setId}`);
    if (response.success && response.data) {
      return Boolean(response.data.bookmarked);
    }
    return false;
  },

  /**
   * Chuyển đổi trạng thái lưu / bỏ lưu bộ học
   */
  async toggleBookmark(setId: string | number, currentStatus: boolean): Promise<boolean> {
    if (currentStatus) {
      return await this.removeBookmark(setId);
    } else {
      return await this.addBookmark(setId);
    }
  },
};

export default bookmarkService;
