import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

/**
 * Phát âm thanh từ đường dẫn audio_url của thẻ
 * - Trên môi trường Web: dùng Audio API gốc của trình duyệt
 * - Trên thiết bị Native: hỗ trợ mở liên kết audio qua Linking
 */
export async function playAudio(url: string | null | undefined): Promise<void> {
  if (!url || typeof url !== 'string') return;
  const cleanUrl = url.trim();
  if (!cleanUrl) return;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Audio' in window) {
    try {
      const audio = new window.Audio(cleanUrl);
      await audio.play();
    } catch (err) {
      console.warn('Lỗi phát âm thanh web:', err);
    }
  } else {
    try {
      await Linking.openURL(cleanUrl);
    } catch (err) {
      console.warn('Lỗi mở đường dẫn âm thanh:', err);
    }
  }
}

export default playAudio;
