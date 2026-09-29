import api from './api';
import { User } from '../contexts/AuthContext';

export interface UpdateProfilePayload {
  full_name?: string | null;
  avatar_url?: string | null;
}

export const userService = {
  /**
   * Lấy thông tin người dùng hiện tại từ Backend (/api/auth/me)
   */
  getCurrentUser: async (): Promise<User> => {
    const res = await api.get<any>('/auth/me');
    return res?.data?.user || res?.data;
  },

  /**
   * Cập nhật thông tin hồ sơ người dùng (/api/auth/profile)
   * Backend hiện tại hỗ trợ cập nhật: full_name, avatar_url
   */
  updateProfile: async (payload: UpdateProfilePayload): Promise<User> => {
    const res = await api.patch<any>('/auth/profile', payload);
    return res?.data?.user || res?.data;
  },
};

export default userService;
