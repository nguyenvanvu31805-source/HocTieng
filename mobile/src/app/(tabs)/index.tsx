import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { StudySet } from '@/types/studySet';
import api from '@/services/api';
import cardProgressService from '@/services/cardProgressService';
import studySessionService from '@/services/studySessionService';
import { StudyStats } from '@/types/studySession';
import StudySetCard from '@/components/StudySetCard';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [weakWordsCount, setWeakWordsCount] = useState<number>(0);
  const [studyStats, setStudyStats] = useState<StudyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchWeakCount = useCallback(async () => {
    if (!isAuthenticated) {
      setWeakWordsCount(0);
      return;
    }
    const res = await cardProgressService.getWeakCards({ page: 1, limit: 1 });
    if (res && res.summary) {
      setWeakWordsCount(res.summary.total_weak_cards || 0);
    } else {
      setWeakWordsCount(0);
    }
  }, [isAuthenticated]);

  const fetchStudyStats = useCallback(async () => {
    if (!isAuthenticated) {
      setStudyStats(null);
      return;
    }
    try {
      const stats = await studySessionService.getStudyStats();
      setStudyStats(stats);
    } catch {
      setStudyStats(null);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      fetchWeakCount();
      fetchStudyStats();
    }, [fetchWeakCount, fetchStudyStats]),
  );

  const fetchFeaturedSets = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setErrorMessage('');

    try {
      // Gọi API lấy danh sách bộ học
      const response = await api.get<StudySet[]>('/study-sets');
      if (response.success && Array.isArray(response.data)) {
        setStudySets(response.data);
      } else {
        setStudySets([]);
      }
    } catch (error: any) {
      setErrorMessage(
        error?.data?.message ||
          error?.message ||
          'Không thể tải dữ liệu bộ học. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturedSets();
  }, [fetchFeaturedSets]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeaturedSets(true);
    fetchWeakCount();
    fetchStudyStats();
  };

  const displayName = user?.full_name || user?.username || 'Bạn';

  const formatStudyDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0p';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}p`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hours}h ${remMins}p` : `${hours}h`;
  };

  // Header component cho FlatList
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Lời chào người dùng */}
      <View style={styles.greetingBox}>
        <View style={styles.greetingTextContainer}>
          <Text style={styles.greetingTitle}>Xin chào, {displayName}! 👋</Text>
          <Text style={styles.greetingSubtitle}>
            Hôm nay bạn muốn học thêm từ vựng gì nào?
          </Text>
        </View>
        <View style={styles.userBadge}>
          <Text style={styles.userBadgeText}>
            {(displayName[0] || 'U').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Khối thống kê Chuỗi học tập (Learning Streak & Study Stats) */}
      {isAuthenticated && studyStats && (
        <View style={styles.streakStatsCard}>
          <View style={styles.streakHeaderRow}>
            <View style={styles.streakBadge}>
              <Text style={styles.streakFlameIcon}>🔥</Text>
              <Text style={styles.streakBadgeText}>
                {studyStats.current_streak > 0
                  ? `${studyStats.current_streak} NGÀY LIÊN TIẾP`
                  : 'BẮT ĐẦU CHUỖI'}
              </Text>
            </View>
            <Text style={styles.streakStatusBadge}>
              {studyStats.today_studied ? 'Đã học hôm nay 🎉' : 'Chưa học hôm nay ⏳'}
            </Text>
          </View>

          <View style={styles.statsSummaryGrid}>
            <View style={styles.statsGridItem}>
              <Text style={styles.statGridVal}>🔥 {studyStats.current_streak}</Text>
              <Text style={styles.statGridLbl}>Chuỗi ngày</Text>
            </View>
            <View style={styles.statGridDivider} />
            <View style={styles.statsGridItem}>
              <Text style={styles.statGridVal}>🏆 {studyStats.longest_streak}</Text>
              <Text style={styles.statGridLbl}>Kỷ lục</Text>
            </View>
            <View style={styles.statGridDivider} />
            <View style={styles.statsGridItem}>
              <Text style={styles.statGridVal}>📚 {studyStats.total_sessions}</Text>
              <Text style={styles.statGridLbl}>Phiên học</Text>
            </View>
            <View style={styles.statGridDivider} />
            <View style={styles.statsGridItem}>
              <Text style={styles.statGridVal}>
                ⏱ {formatStudyDuration(studyStats.total_duration_seconds)}
              </Text>
              <Text style={styles.statGridLbl}>Thời gian</Text>
            </View>
          </View>
        </View>
      )}

      {/* Banner tạo động lực học tập */}
      <View style={styles.bannerCard}>
        <Text style={styles.bannerEyebrow}>TIẾP TỤC HÀNH TRÌNH</Text>
        <Text style={styles.bannerTitle}>Học mỗi ngày, nhớ dài lâu.</Text>
        <Text style={styles.bannerText}>
          Ôn tập thường xuyên giúp ghi nhớ từ vựng sâu hơn theo phương pháp ngắt quãng.
        </Text>
        <TouchableOpacity
          style={styles.bannerButton}
          onPress={() => router.push('/(tabs)/library' as any)}
          activeOpacity={0.8}>
          <Text style={styles.bannerButtonText}>Khám phá Thư viện →</Text>
        </TouchableOpacity>
      </View>

      {/* Thẻ nhắc nhở Từ cần ôn lại (Từ yếu) */}
      {isAuthenticated && weakWordsCount > 0 && (
        <View style={styles.weakWordsCard}>
          <View style={styles.weakWordsHeader}>
            <View style={styles.weakWordsIconBox}>
              <Text style={styles.weakWordsIcon}>⚠️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.weakWordsBadge}>TỪ CẦN ÔN LẠI</Text>
              <Text style={styles.weakWordsTitle}>
                Bạn có {weakWordsCount} từ vựng cần củng cố
              </Text>
            </View>
          </View>
          <View style={styles.weakWordsActionRow}>
            <TouchableOpacity
              style={styles.weakWordsReviewBtn}
              onPress={() => router.push('/review/weak' as any)}
              activeOpacity={0.85}>
              <Text style={styles.weakWordsReviewBtnText}>⚡ Học lại ngay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.weakWordsListBtn}
              onPress={() => router.push('/weak-words' as any)}
              activeOpacity={0.85}>
              <Text style={styles.weakWordsListBtnText}>Xem danh sách →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Lối tắt truy cập Lớp học */}
      <TouchableOpacity
        style={styles.classesShortcutCard}
        onPress={() => router.push('/classes' as any)}
        activeOpacity={0.85}>
        <View style={styles.classesShortcutLeft}>
          <View style={styles.classesShortcutIconBox}>
            <Text style={styles.classesShortcutIcon}>🏫</Text>
          </View>
          <View style={styles.classesShortcutTextBox}>
            <Text style={styles.classesShortcutTitle}>Lớp học của tôi</Text>
            <Text style={styles.classesShortcutSubtitle}>
              Tham gia bằng mã hoặc quản lý lớp học
            </Text>
          </View>
        </View>
        <Text style={styles.classesShortcutArrow}>›</Text>
      </TouchableOpacity>

      {/* Tiêu đề danh sách */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Bộ học nổi bật</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/library' as any)}>
          <Text style={styles.seeAllText}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Footer / Empty / Error component
  const renderEmptyOrError = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4255FF" />
          <Text style={styles.loadingText}>Đang tải bộ học...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Đã xảy ra lỗi</Text>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchFeaturedSets(false)}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centerBox}>
        <Text style={styles.emptyIcon}>📚</Text>
        <Text style={styles.emptyTitle}>Chưa có bộ học nào</Text>
        <Text style={styles.emptySubtitle}>
          Hiện tại hệ thống chưa có bộ học công khai nào được tạo.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={loading || errorMessage ? [] : studySets}
        keyExtractor={(item) => String(item.set_id)}
        renderItem={({ item }) => (
          <StudySetCard
            studySet={item}
            onPress={(set) => router.push(`/study-set/${set.set_id}` as any)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyOrError}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4255FF']}
            tintColor="#4255FF"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  headerContainer: {
    paddingTop: 12,
    marginBottom: 8,
  },
  greetingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  greetingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2E3856',
    letterSpacing: 0.2,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: '#60646C',
    marginTop: 4,
  },
  userBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4255FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  userBadgeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  bannerCard: {
    backgroundColor: '#4255FF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  bannerEyebrow: {
    color: '#D2D8FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    lineHeight: 26,
  },
  bannerText: {
    color: '#E8ECFF',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  bannerButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: '#4255FF',
    fontSize: 13,
    fontWeight: '700',
  },
  classesShortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginBottom: 20,
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  classesShortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  classesShortcutIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  classesShortcutIcon: {
    fontSize: 22,
  },
  classesShortcutTextBox: {
    flex: 1,
  },
  classesShortcutTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 2,
  },
  classesShortcutSubtitle: {
    fontSize: 12,
    color: '#60646C',
  },
  classesShortcutArrow: {
    fontSize: 22,
    fontWeight: '600',
    color: '#939BB4',
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E3856',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4255FF',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#60646C',
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D93025',
    marginBottom: 6,
  },
  errorMessageText: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#4255FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: 20,
  },
  weakWordsCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  weakWordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  weakWordsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weakWordsIcon: {
    fontSize: 22,
  },
  weakWordsBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C2410C',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  weakWordsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7C2D12',
    lineHeight: 20,
  },
  weakWordsActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weakWordsReviewBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  weakWordsReviewBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  weakWordsListBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  weakWordsListBtnText: {
    color: '#C2410C',
    fontSize: 13,
    fontWeight: '600',
  },
  // Streak & Study Stats Card
  streakStatsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  streakHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  streakFlameIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  streakBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  streakStatusBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  statsSummaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  statsGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  statGridVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  statGridLbl: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  statGridDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
});
