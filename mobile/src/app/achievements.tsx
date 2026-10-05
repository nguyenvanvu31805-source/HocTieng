import React, { useState, useCallback, useMemo } from 'react';
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
import achievementService from '@/services/achievementService';
import { Achievement, AchievementSummary } from '@/types/achievement';

type FilterTab = 'ALL' | 'UNLOCKED' | 'LOCKED';

export default function AchievementsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [summary, setSummary] = useState<AchievementSummary | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchAchievements = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated) {
      setSummary(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!isRefresh) setLoading(true);
    setErrorMessage('');

    try {
      const data = await achievementService.getAchievements();
      setSummary(data);
    } catch (err: any) {
      setErrorMessage(
        err?.data?.message || err?.message || 'Không thể tải thành tích học tập.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      fetchAchievements(false);
    }, [fetchAchievements]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAchievements(true);
  };

  const filteredItems = useMemo(() => {
    if (!summary) return [];
    if (activeTab === 'UNLOCKED') {
      return summary.items.filter((item) => item.unlocked);
    }
    if (activeTab === 'LOCKED') {
      return summary.items.filter((item) => !item.unlocked);
    }
    return summary.items;
  }, [summary, activeTab]);

  const total = summary?.total || 0;
  const unlockedCount = summary?.unlockedCount || 0;
  const percentUnlocked = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Bar: Back Button & Screen Title */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleBox}>
          <Text style={styles.screenTitle}>Thành tích học tập</Text>
        </View>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryTrophyBox}>
            <Text style={styles.summaryTrophyIcon}>🏆</Text>
          </View>
          <View style={styles.summaryTextBox}>
            <Text style={styles.summaryTitle}>
              Đã đạt {unlockedCount} / {total} thành tích
            </Text>
            <Text style={styles.summarySubtitle}>
              {unlockedCount === total
                ? 'Tuyệt vời! Bạn đã mở khóa toàn bộ thành tích! 🎉'
                : 'Tiếp tục học mỗi ngày để mở khóa thêm nhiều thành tích mới!'}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[styles.progressBarFill, { width: `${percentUnlocked}%` }]}
          />
        </View>
        <Text style={styles.progressPercentText}>{percentUnlocked}% hoàn thành</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        <TouchableOpacity
          style={[styles.filterTab, activeTab === 'ALL' && styles.filterTabActive]}
          onPress={() => setActiveTab('ALL')}
          activeOpacity={0.8}>
          <Text
            style={[
              styles.filterTabText,
              activeTab === 'ALL' && styles.filterTabTextActive,
            ]}>
            Tất cả ({total})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            activeTab === 'UNLOCKED' && styles.filterTabActive,
          ]}
          onPress={() => setActiveTab('UNLOCKED')}
          activeOpacity={0.8}>
          <Text
            style={[
              styles.filterTabText,
              activeTab === 'UNLOCKED' && styles.filterTabTextActive,
            ]}>
            Đã đạt ({unlockedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            activeTab === 'LOCKED' && styles.filterTabActive,
          ]}
          onPress={() => setActiveTab('LOCKED')}
          activeOpacity={0.8}>
          <Text
            style={[
              styles.filterTabText,
              activeTab === 'LOCKED' && styles.filterTabTextActive,
            ]}>
            Chưa đạt ({total - unlockedCount})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Achievement }) => {
    const isUnlocked = item.unlocked;
    const progressPercent =
      item.target > 0 ? Math.min(100, Math.round((item.progress / item.target) * 100)) : 0;

    return (
      <View
        style={[
          styles.achievementCard,
          isUnlocked ? styles.achievementCardUnlocked : styles.achievementCardLocked,
        ]}>
        <View style={styles.cardMainRow}>
          {/* Icon Badge */}
          <View
            style={[
              styles.iconBox,
              isUnlocked ? styles.iconBoxUnlocked : styles.iconBoxLocked,
            ]}>
            <Text style={styles.iconEmoji}>{isUnlocked ? item.icon : '🔒'}</Text>
          </View>

          {/* Title & Description */}
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <Text
                style={[
                  styles.cardTitle,
                  !isUnlocked && styles.cardTitleLocked,
                ]}>
                {item.title}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  isUnlocked ? styles.statusBadgeUnlocked : styles.statusBadgeLocked,
                ]}>
                <Text
                  style={[
                    styles.statusBadgeText,
                    isUnlocked
                      ? styles.statusBadgeTextUnlocked
                      : styles.statusBadgeTextLocked,
                  ]}>
                  {isUnlocked ? '✓ Đã đạt' : 'Chưa đạt'}
                </Text>
              </View>
            </View>

            <Text style={styles.cardDesc}>{item.description}</Text>

            {/* Progress Bar & Counter */}
            <View style={styles.itemProgressContainer}>
              <View style={styles.itemProgressTrack}>
                <View
                  style={[
                    styles.itemProgressFill,
                    isUnlocked
                      ? styles.itemProgressFillUnlocked
                      : styles.itemProgressFillLocked,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
              <Text style={styles.itemProgressText}>
                {item.progress} / {item.target}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyOrError = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4255FF" />
          <Text style={styles.loadingText}>Đang tải thành tích...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Đã xảy ra lỗi</Text>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchAchievements(false)}
              activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backErrorBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}>
              <Text style={styles.backErrorBtnText}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (activeTab === 'UNLOCKED' && unlockedCount === 0) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyTitle}>Bạn chưa đạt thành tích nào.</Text>
          <Text style={styles.emptySubtitle}>
            Bắt đầu buổi học đầu tiên để mở khóa thành tích ngay hôm nay!
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push('/(tabs)/library' as any)}
            activeOpacity={0.85}>
            <Text style={styles.exploreButtonText}>Bắt đầu học ngay →</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={loading || errorMessage ? [] : filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
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
    paddingBottom: 36,
  },
  headerContainer: {
    paddingTop: 8,
    marginBottom: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 12,
  },
  backBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E3856',
  },
  titleBox: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E3856',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTrophyBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryTrophyIcon: {
    fontSize: 24,
  },
  summaryTextBox: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EEF2FF',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4255FF',
    borderRadius: 4,
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4255FF',
    alignSelf: 'flex-end',
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: '#4255FF',
    borderColor: '#4255FF',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  achievementCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  achievementCardUnlocked: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  achievementCardLocked: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8ECF4',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBoxUnlocked: {
    backgroundColor: '#DCFCE7',
  },
  iconBoxLocked: {
    backgroundColor: '#F1F5F9',
  },
  iconEmoji: {
    fontSize: 22,
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803D',
    flex: 1,
    marginRight: 8,
  },
  cardTitleLocked: {
    color: '#334155',
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusBadgeUnlocked: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeLocked: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeTextUnlocked: {
    color: '#15803D',
  },
  statusBadgeTextLocked: {
    color: '#64748B',
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 10,
  },
  itemProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemProgressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  itemProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  itemProgressFillUnlocked: {
    backgroundColor: '#16A34A',
  },
  itemProgressFillLocked: {
    backgroundColor: '#94A3B8',
  },
  itemProgressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    minWidth: 36,
    textAlign: 'right',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 6,
  },
  errorMessageText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  retryButton: {
    backgroundColor: '#4255FF',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  backErrorBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  backErrorBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  exploreButton: {
    backgroundColor: '#4255FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
