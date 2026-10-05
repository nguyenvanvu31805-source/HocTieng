import studySessionService from '@/services/studySessionService';
import { Achievement, AchievementSummary } from '@/types/achievement';

export const achievementService = {
  /**
   * Tính toán danh sách thành tích học tập dựa trên dữ liệu thật từ Backend API.
   * Sử dụng:
   * - GET /api/study-sessions/stats (current_streak, longest_streak, total_sessions, total_study_days)
   * - GET /api/study-sessions (danh sách phiên học để xác định hoàn thành TEST và WEAK_REVIEW)
   */
  async getAchievements(): Promise<AchievementSummary> {
    try {
      const [statsResult, sessionsResult] = await Promise.allSettled([
        studySessionService.getStudyStats(),
        studySessionService.getSessions({ limit: 100 }),
      ]);

      const stats = statsResult.status === 'fulfilled' ? statsResult.value : null;
      const sessions = sessionsResult.status === 'fulfilled' ? sessionsResult.value : [];

      const totalSessions = stats?.total_sessions || 0;
      const totalStudyDays = stats?.total_study_days || 0;
      const currentStreak = stats?.current_streak || 0;
      const longestStreak = stats?.longest_streak || 0;
      const bestStreak = Math.max(currentStreak, longestStreak);

      // Đếm số phiên WEAK_REVIEW hoàn thành
      const weakSessionsCount = sessions.filter(
        (s) => s.mode === 'WEAK_REVIEW' && (s.status === 'COMPLETED' || Boolean(s.ended_at))
      ).length;

      // Đếm số phiên TEST hoàn thành
      const testSessionsCount = sessions.filter(
        (s) => s.mode === 'TEST' && (s.status === 'COMPLETED' || Boolean(s.ended_at))
      ).length;

      const items: Achievement[] = [
        {
          id: 'first_session',
          title: 'Buổi học đầu tiên',
          description: 'Hoàn thành buổi học đầu tiên.',
          icon: '🎓',
          target: 1,
          progress: Math.min(totalSessions, 1),
          unlocked: totalSessions >= 1,
        },
        {
          id: 'hard_working',
          title: 'Chăm chỉ',
          description: 'Hoàn thành 5 buổi học.',
          icon: '⚡',
          target: 5,
          progress: Math.min(totalSessions, 5),
          unlocked: totalSessions >= 5,
        },
        {
          id: 'persevering',
          title: 'Kiên trì',
          description: 'Hoàn thành 10 buổi học.',
          icon: '🏅',
          target: 10,
          progress: Math.min(totalSessions, 10),
          unlocked: totalSessions >= 10,
        },
        {
          id: 'streak_3',
          title: 'Chuỗi 3 ngày',
          description: 'Duy trì học tập 3 ngày liên tiếp.',
          icon: '🔥',
          target: 3,
          progress: Math.min(bestStreak, 3),
          unlocked: bestStreak >= 3,
        },
        {
          id: 'streak_7',
          title: 'Chuỗi 7 ngày',
          description: 'Duy trì học tập 7 ngày liên tiếp.',
          icon: '🏆',
          target: 7,
          progress: Math.min(bestStreak, 7),
          unlocked: bestStreak >= 7,
        },
        {
          id: 'first_day',
          title: 'Ngày học đầu tiên',
          description: 'Có ngày học đầu tiên.',
          icon: '📅',
          target: 1,
          progress: Math.min(totalStudyDays, 1),
          unlocked: totalStudyDays >= 1,
        },
        {
          id: 'weak_review',
          title: 'Ôn tập từ yếu',
          description: 'Hoàn thành ít nhất 1 phiên ôn từ yếu.',
          icon: '🎯',
          target: 1,
          progress: Math.min(weakSessionsCount, 1),
          unlocked: weakSessionsCount >= 1,
        },
        {
          id: 'completed_test',
          title: 'Hoàn thành bài kiểm tra',
          description: 'Hoàn thành ít nhất 1 bài kiểm tra.',
          icon: '📝',
          target: 1,
          progress: Math.min(testSessionsCount, 1),
          unlocked: testSessionsCount >= 1,
        },
      ];

      const unlockedCount = items.filter((a) => a.unlocked).length;

      return {
        total: items.length,
        unlockedCount,
        items,
      };
    } catch (error) {
      console.error('Error computing achievements:', error);
      throw error;
    }
  },
};

export default achievementService;
