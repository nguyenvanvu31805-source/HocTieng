import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ReminderSettings, DEFAULT_REMINDER_SETTINGS } from '@/types/reminder';

const getStorageKey = (userId?: number | null): string => {
  return userId ? `quizlet_reminder_settings_${userId}` : 'quizlet_reminder_settings_guest';
};

export const reminderService = {
  /**
   * Lấy cài đặt nhắc học từ bộ nhớ thiết bị.
   * Nếu chưa có dữ liệu, trả về default: { enabled: false, reminderTime: '19:00' }.
   */
  async getReminderSettings(userId?: number | null): Promise<ReminderSettings> {
    try {
      const key = getStorageKey(userId);
      let jsonStr: string | null = null;

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          jsonStr = window.localStorage.getItem(key);
        }
      } else {
        jsonStr = await SecureStore.getItemAsync(key);
      }

      if (!jsonStr) {
        return { ...DEFAULT_REMINDER_SETTINGS };
      }

      const parsed = JSON.parse(jsonStr);
      return {
        enabled:
          typeof parsed.enabled === 'boolean'
            ? parsed.enabled
            : DEFAULT_REMINDER_SETTINGS.enabled,
        reminderTime:
          typeof parsed.reminderTime === 'string' && parsed.reminderTime
            ? parsed.reminderTime
            : DEFAULT_REMINDER_SETTINGS.reminderTime,
      };
    } catch (error) {
      console.error('Error reading reminder settings:', error);
      return { ...DEFAULT_REMINDER_SETTINGS };
    }
  },

  /**
   * Lưu cài đặt nhắc học vào bộ nhớ an toàn trên thiết bị.
   */
  async saveReminderSettings(
    settings: ReminderSettings,
    userId?: number | null
  ): Promise<boolean> {
    try {
      const key = getStorageKey(userId);
      const jsonStr = JSON.stringify(settings);

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, jsonStr);
        }
      } else {
        await SecureStore.setItemAsync(key, jsonStr);
      }
      return true;
    } catch (error) {
      console.error('Error saving reminder settings:', error);
      return false;
    }
  },

  /**
   * Xóa cài đặt nhắc học của user hiện tại, trở về mặc định.
   */
  async resetReminderSettings(userId?: number | null): Promise<boolean> {
    try {
      const key = getStorageKey(userId);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } else {
        await SecureStore.deleteItemAsync(key);
      }
      return true;
    } catch (error) {
      console.error('Error resetting reminder settings:', error);
      return false;
    }
  },
};

export default reminderService;
