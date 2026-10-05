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
import { WeakCard } from '@/types/cardProgress';
import { StudyStats } from '@/types/studySession';
import api from '@/services/api';
import cardProgressService from '@/services/cardProgressService';
import studySessionService from '@/services/studySessionService';
import StudySetCard from '@/components/StudySetCard';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [weakCards, setWeakCards] = useState<WeakCard[]>([]);
  const [weakWordsCount, setWeakWordsCount] = useState<number>(0);
  const [studyStats, setStudyStats] = useState<StudyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchDashboardData = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      setErrorMessage('');

      try {
        const promises: [
          Promise<StudyStats | null>,
          Promise<import('@/types/cardProgress').WeakWordsResponseData | null>,
          Promise<any>,
        ] = [
          isAuthenticated ? studySessionService.getStudyStats() : Promise.resolve(null),
          isAuthenticated
            ? cardProgressService.getWeakCards({ page: 1, limit: 3 })
            : Promise.resolve(null),
          api.get<StudySet[]>('/study-sets'),
        ];

        const [statsResult, weakResult, setsResult] = await Promise.allSettled(promises);

        // 1. Cập nhật Thống kê phiên học & Chuỗi streak
        if (statsResult.status === 'fulfilled' && statsResult.value) {
          setStudyStats(statsResult.value);
        } else {
          setStudyStats(null);
        }

        // 2. Cập nhật Từ cần ôn (Weak Words)
        if (weakResult.status === 'fulfilled' && weakResult.value) {
          const weakData = weakResult.value;
          setWeakWordsCount(weakData.summary?.total_weak_cards || 0);
          setWeakCards(weakData.items || []);
        } else {
          setWeakWordsCount(0);
          setWeakCards([]);
        }

        // 3. Cập nhật Bộ từ vựng nổi bật
        if (
          setsResult.status === 'fulfilled' &&
          setsResult.value?.success &&
          Array.isArray(setsResult.value.data)
        ) {
          setStudySets(setsResult.value.data);
        } else {
          setStudySets([]);
        }
      } catch (error: any) {
        setErrorMessage(
          error?.data?.message ||
            error?.message ||
            'Không thể tải dữ liệu bảng điều khiển. Vui lòng thử lại.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData(true);
    }, [fetchDashboardData]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(true);
  };

  const displayName = user?.full_name || user?.username || 'Bạn';
  const role = user?.role || 'STUDENT';

  const formatStudyDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0p';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}p`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hours}h ${remMins}p` : `${hours}h`;
  };

  const renderRoleBadge = () => {
    if (role === 'TEACHER') {
      return (
        <View style={[styles.roleBadge, styles.roleBadgeTeacher]}>
          <Text style={styles.roleBadgeTeacherText}>👨‍🏫 GIÁO VIÊN</Text>
        </View>
      );
    }
    if (role === 'ADMIN') {
      return (
        <View style={[styles.roleBadge, styles.roleBadgeAdmin]}>
          <Text style={styles.roleBadgeAdminText}>🛡️ QUẢN TRỊ VIÊN</Text>
        </View>
      );
    }
    return (
      <View style={[styles.roleBadge, styles.roleBadgeStudent]}>
        <Text style={styles.roleBadgeStudentText}>🎓 HỌC SINH</Text>
      </View>
    );
  };

  // Header Component cho FlatList
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* 1. Lời chào cá nhân hóa */}
      <View style={styles.greetingBox}>
        <View style={styles.greetingTextContainer}>
          <View style={styles.greetingRoleRow}>
            <Text style={styles.greetingTitle}>Xin chào, {displayName}! 👋</Text>
            {renderRoleBadge()}
          </View>
          <Text style={styles.greetingSubtitle}>
            {role === 'TEACHER'
              ? 'Quản lý lớp học và theo dõi tiến độ bài tập của học sinh'
              : role === 'ADMIN'
                ? 'Hệ thống QuizletClone đang vận hành bình thường'
                : 'Hôm nay bạn muốn học gì?'}
          </Text>
        </View>
        <View style={styles.userBadge}>
          <Text style={styles.userBadgeText}>
            {(displayName[0] || 'U').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* 2. 🔥 Streak Card & Thống kê phiên học */}
      {isAuthenticated && studyStats && (
        <View style={styles.streakStatsCard}>
          <View style={styles.streakHeaderRow}>
            <View style={styles.streakBadge}>
              <Text style={styles.streakFlameIcon}>🔥</Text>
              <Text style={styles.streakBadgeText}>
                {studyStats.current_streak > 0
                  ? `${studyStats.current_streak} NGÀY LIÊN TIẾP`
                  : 'BẮT ĐẦU CHUỖI MỚI'}
              </Text>
            </View>
            <View
              style={[
                styles.todayStatusBadge,
                studyStats.today_studied
                  ? styles.todayStatusStudied
                  : styles.todayStatusPending,
              ]}>
              <Text
                style={[
                  styles.todayStatusText,
                  studyStats.today_studied
                    ? styles.todayStatusStudiedText
                    : styles.todayStatusPendingText,
                ]}>
                {studyStats.today_studied ? '✓ Đã học hôm nay' : '⏳ Chưa học hôm nay'}
              </Text>
            </View>
          </View>

          {/* Dòng trạng thái động lực */}
          <Text style={styles.streakMotivationText}>
            {studyStats.today_studied
              ? `Tuyệt vời! Bạn đã duy trì chuỗi học thành công hôm nay 🎉${
                  studyStats.today_duration_seconds > 0
                    ? ` (Thời gian: ${formatStudyDuration(studyStats.today_duration_seconds)})`
                    : ''
                }`
              : studyStats.current_streak > 0
                ? `Học ngay hôm nay để không bỏ lỡ chuỗi ${studyStats.current_streak} ngày liên tiếp!`
                : 'Hoàn thành một phiên học để bắt đầu chuỗi ngày rực lửa của bạn!'}
          </Text>

          {/* Grid thống kê 5 chỉ số học tập */}
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
            <View style={styles.statGridDivider} />
            <View style={styles.statsGridItem}>
              <Text style={styles.statGridVal}>📅 {studyStats.total_study_days}</Text>
              <Text style={styles.statGridLbl}>Ngày học</Text>
            </View>
          </View>

          {/* Nút xem Lịch sử học tập */}
          <TouchableOpacity
            style={styles.streakHistoryLink}
            onPress={() => router.push('/learning-history' as any)}
            activeOpacity={0.8}>
            <Text style={styles.streakHistoryLinkText}>📚 Xem lịch sử học tập →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. ⚡ Quick Action Grid (Lối tắt nhanh) */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.subSectionTitle}>Lối tắt nhanh</Text>
        <View style={styles.quickActionsGrid}>
          {/* Lối tắt 1: Từ cần ôn */}
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/weak-words' as any)}
            activeOpacity={0.8}>
            <View style={[styles.quickActionIconBox, { backgroundColor: '#FFF7ED' }]}>
              <Text style={styles.quickActionIcon}>🎯</Text>
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Từ cần ôn</Text>
              <Text style={styles.quickActionDesc}>
                {weakWordsCount > 0 ? `${weakWordsCount} từ cần củng cố` : 'Xem từ yếu'}
              </Text>
            </View>
            {weakWordsCount > 0 && (
              <View style={styles.weakBadgeSmall}>
                <Text style={styles.weakBadgeSmallText}>{weakWordsCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Lối tắt 2: Ôn tập nhanh */}
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/review/weak' as any)}
            activeOpacity={0.8}>
            <View style={[styles.quickActionIconBox, { backgroundColor: '#FEF2F2' }]}>
              <Text style={styles.quickActionIcon}>⚡</Text>
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Ôn nhanh</Text>
              <Text style={styles.quickActionDesc}>Luyện từ yếu</Text>
            </View>
          </TouchableOpacity>

          {/* Lối tắt 3: Lớp học */}
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/classes' as any)}
            activeOpacity={0.8}>
            <View style={[styles.quickActionIconBox, { backgroundColor: '#EEF2FF' }]}>
              <Text style={styles.quickActionIcon}>🏫</Text>
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Lớp học</Text>
              <Text style={styles.quickActionDesc}>Bài tập & lớp</Text>
            </View>
          </TouchableOpacity>

          {/* Lối tắt 4: Thư viện */}
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(tabs)/library' as any)}
            activeOpacity={0.8}>
            <View style={[styles.quickActionIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Text style={styles.quickActionIcon}>📚</Text>
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Thư viện</Text>
              <Text style={styles.quickActionDesc}>Bộ từ vựng</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. 🎯 Từ cần ôn (Weak Words Section) */}
      {isAuthenticated && (
        <View style={styles.weakWordsSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>🎯 Từ cần ôn lại</Text>
              {weakWordsCount > 0 && (
                <View style={styles.weakCountBadge}>
                  <Text style={styles.weakCountBadgeText}>{weakWordsCount}</Text>
                </View>
              )}
            </View>
            {weakWordsCount > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/weak-words' as any)}
                activeOpacity={0.7}>
                <Text style={styles.seeAllText}>Xem tất cả ({weakWordsCount}) →</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Render danh sách xem trước từ yếu nếu có */}
          {weakWordsCount > 0 && weakCards.length > 0 ? (
            <View style={styles.weakPreviewContainer}>
              {weakCards.map((card) => (
                <View key={card.card_id} style={styles.weakCardItem}>
                  <View style={styles.weakCardTop}>
                    <Text style={styles.weakCardTerm} numberOfLines={1}>
                      {card.term}
                    </Text>
                    <View style={styles.wrongCountBadge}>
                      <Text style={styles.wrongCountText}>
                        ❌ Sai {card.wrong_count} lần
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.weakCardDef} numberOfLines={2}>
                    {card.definition}
                  </Text>
                  <View style={styles.weakCardFooter}>
                    <Text style={styles.weakCardSetTitle} numberOfLines={1}>
                      📁 {card.set_title || 'Bộ từ vựng'}
                    </Text>
                    <Text style={styles.weakCardMastery}>
                      ⭐ Cấp {card.mastery_level}/3
                    </Text>
                  </View>
                </View>
              ))}

              {/* Hàng nút hành động ôn từ yếu */}
              <View style={styles.weakActionRow}>
                <TouchableOpacity
                  style={styles.weakReviewPrimaryBtn}
                  onPress={() => router.push('/review/weak' as any)}
                  activeOpacity={0.85}>
                  <Text style={styles.weakReviewPrimaryBtnText}>⚡ Ôn từ yếu ngay</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.weakReviewSecondaryBtn}
                  onPress={() => router.push('/weak-words' as any)}
                  activeOpacity={0.85}>
                  <Text style={styles.weakReviewSecondaryBtnText}>
                    Danh sách từ yếu ({weakWordsCount})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Trạng thái trống thân thiện khi không có từ yếu */
            <View style={styles.weakEmptyCard}>
              <Text style={styles.weakEmptyIcon}>🎉</Text>
              <Text style={styles.weakEmptyTitle}>Bạn chưa có từ yếu nào!</Text>
              <Text style={styles.weakEmptySubtitle}>
                Thật tuyệt vời! Bạn đang ghi nhớ rất tốt các từ vựng đã học. Hãy tiếp tục học
                các bộ từ mới nhé!
              </Text>
              <TouchableOpacity
                style={styles.weakEmptyButton}
                onPress={() => router.push('/(tabs)/library' as any)}
                activeOpacity={0.85}>
                <Text style={styles.weakEmptyButtonText}>Khám phá bộ học mới →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* 5. Banner tạo động lực học tập */}
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

      {/* 6. Tiêu đề danh sách bộ từ vựng nổi bật */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Bộ từ vựng nổi bật</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/library' as any)}>
          <Text style={styles.seeAllText}>Xem tất cả →</Text>
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
            onPress={() => fetchDashboardData(false)}>
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
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  headerContainer: {
    paddingTop: 12,
    marginBottom: 8,
  },
  // 1. Greeting
  greetingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  greetingRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2E3856',
    letterSpacing: 0.2,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: '#60646C',
    marginTop: 4,
    lineHeight: 18,
  },
  roleBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  roleBadgeStudent: {
    backgroundColor: '#EEF2FF',
  },
  roleBadgeStudentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4255FF',
  },
  roleBadgeTeacher: {
    backgroundColor: '#F0FDF4',
  },
  roleBadgeTeacherText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  roleBadgeAdmin: {
    backgroundColor: '#FEF2F2',
  },
  roleBadgeAdminText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
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

  // 2. Streak Card & Stats
  streakStatsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
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
    marginBottom: 10,
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
  todayStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 12,
  },
  todayStatusStudied: {
    backgroundColor: '#DCFCE7',
  },
  todayStatusStudiedText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  todayStatusPending: {
    backgroundColor: '#FEF3C7',
  },
  todayStatusPendingText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
  todayStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  streakMotivationText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  statGridLbl: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  statGridDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  streakHistoryLink: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakHistoryLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4255FF',
  },

  // 3. Quick Actions
  quickActionsContainer: {
    marginBottom: 18,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 10,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    position: 'relative',
  },
  quickActionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  quickActionIcon: {
    fontSize: 18,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 2,
  },
  quickActionDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  weakBadgeSmall: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EA580C',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  weakBadgeSmallText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // 4. Weak Words Section
  weakWordsSection: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weakCountBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  weakCountBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C2410C',
  },
  weakPreviewContainer: {
    gap: 10,
  },
  weakCardItem: {
    backgroundColor: '#FFFAF5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  weakCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  weakCardTerm: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E3856',
    flex: 1,
    marginRight: 8,
  },
  wrongCountBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  wrongCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  weakCardDef: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 18,
  },
  weakCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#FFEDD5',
    paddingTop: 6,
  },
  weakCardSetTitle: {
    fontSize: 11,
    color: '#9A3412',
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  weakCardMastery: {
    fontSize: 11,
    color: '#EA580C',
    fontWeight: '700',
  },
  weakActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  weakReviewPrimaryBtn: {
    flex: 1,
    backgroundColor: '#EA580C',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weakReviewPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  weakReviewSecondaryBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  weakReviewSecondaryBtnText: {
    color: '#C2410C',
    fontSize: 13,
    fontWeight: '700',
  },
  // Weak Empty Card
  weakEmptyCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  weakEmptyIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  weakEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  weakEmptySubtitle: {
    fontSize: 12,
    color: '#15803D',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  weakEmptyButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  weakEmptyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // 5. Banner
  bannerCard: {
    backgroundColor: '#2F3A1D',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#2F3A1D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  bannerEyebrow: {
    color: '#CFFF74',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  bannerText: {
    color: '#DCE6D2',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  bannerButton: {
    backgroundColor: '#CFFF74',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: '#2F3A1D',
    fontSize: 13,
    fontWeight: '800',
  },

  // 6. Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2F3A1D',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2F3A1D',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#66705A',
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#D93025',
    marginBottom: 6,
  },
  errorMessageText: {
    fontSize: 13,
    color: '#66705A',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: '#2F3A1D',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: 18,
  },
});
