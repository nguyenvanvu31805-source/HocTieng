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
import studySessionService from '@/services/studySessionService';
import { StudySessionItem, StudySessionMode } from '@/types/studySession';

type FilterMode = 'ALL' | StudySessionMode;

const FILTER_TABS: { key: FilterMode; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'FLASHCARDS', label: 'Flashcards' },
  { key: 'LEARN', label: 'Học' },
  { key: 'TEST', label: 'Kiểm tra' },
  { key: 'MATCH', label: 'Ghép thẻ' },
  { key: 'WEAK_REVIEW', label: 'Ôn từ yếu' },
];

export const formatDuration = (seconds?: number): string => {
  if (!seconds || seconds <= 0) return '0 giây';
  if (seconds < 60) return `${seconds} giây`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} phút`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours} giờ ${remMins} phút` : `${hours} giờ`;
};

export const formatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} · ${hours}:${minutes}`;
};

export const getModeMeta = (mode: StudySessionMode) => {
  switch (mode) {
    case 'FLASHCARDS':
      return { label: 'Flashcards', icon: '🃏', color: '#4255FF', bg: '#EEF2FF' };
    case 'LEARN':
      return { label: 'Học', icon: '📖', color: '#15803D', bg: '#F0FDF4' };
    case 'TEST':
      return { label: 'Kiểm tra', icon: '📝', color: '#B45309', bg: '#FEF3C7' };
    case 'MATCH':
      return { label: 'Ghép thẻ', icon: '🧩', color: '#7C3AED', bg: '#F5F3FF' };
    case 'WEAK_REVIEW':
      return { label: 'Ôn từ yếu', icon: '🎯', color: '#C2410C', bg: '#FFF7ED' };
    default:
      return { label: mode, icon: '📚', color: '#64748B', bg: '#F1F5F9' };
  }
};

export default function LearningHistoryScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [sessions, setSessions] = useState<StudySessionItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterMode>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchSessions = useCallback(
    async (isRefresh = false) => {
      if (!isAuthenticated) {
        setSessions([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (!isRefresh) setLoading(true);
      setErrorMessage('');

      try {
        const data = await studySessionService.getSessions({
          mode: selectedFilter === 'ALL' ? undefined : selectedFilter,
          limit: 100,
        });
        setSessions(data);
      } catch (err: any) {
        setErrorMessage(
          err?.data?.message || err?.message || 'Không thể tải lịch sử học tập.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAuthenticated, selectedFilter],
  );

  useFocusEffect(
    useCallback(() => {
      fetchSessions(false);
    }, [fetchSessions]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSessions(true);
  };

  const handleFilterSelect = (mode: FilterMode) => {
    setSelectedFilter(mode);
  };

  // Client-side safety filter
  const filteredSessions = useMemo(() => {
    if (selectedFilter === 'ALL') return sessions;
    return sessions.filter((s) => s.mode === selectedFilter);
  }, [sessions, selectedFilter]);

  const renderItem = ({ item }: { item: StudySessionItem }) => {
    const modeMeta = getModeMeta(item.mode);
    const displayTitle =
      item.set_title ||
      (item.mode === 'WEAK_REVIEW' ? 'Ôn tập từ vựng yếu' : 'Bộ từ vựng');
    const isCompleted = item.status === 'COMPLETED' || Boolean(item.ended_at);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/learning-history/${item.session_id}` as any)}
        activeOpacity={0.75}>
        {/* Top Row: Title & Mode Badge */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {displayTitle}
          </Text>
          <View style={[styles.modeBadge, { backgroundColor: modeMeta.bg }]}>
            <Text style={styles.modeIcon}>{modeMeta.icon}</Text>
            <Text style={[styles.modeLabel, { color: modeMeta.color }]}>
              {modeMeta.label}
            </Text>
          </View>
        </View>

        {/* Date Row */}
        <Text style={styles.cardDate}>{formatDateTime(item.started_at)}</Text>

        {/* Metrics Row: Cards, Duration, Score */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricText}>🃏 {item.cards_studied || 0} thẻ</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricText}>
              ⏱ {formatDuration(item.duration_seconds)}
            </Text>
          </View>
          {item.mode === 'TEST' && item.score !== null && (
            <>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricTextScore}>
                  🎯 {Number(item.score).toFixed(0)}%
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Footer Row: Status Badge & Chevron */}
        <View style={styles.cardFooter}>
          <View
            style={[
              styles.statusBadge,
              isCompleted ? styles.statusCompleted : styles.statusInProgress,
            ]}>
            <Text
              style={[
                styles.statusText,
                isCompleted
                  ? styles.statusCompletedText
                  : styles.statusInProgressText,
              ]}>
              {isCompleted ? '✓ Hoàn thành' : '⏳ Đang học'}
            </Text>
          </View>
          <Text style={styles.arrowText}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Top Bar: Back button, Title & Session Count */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleBox}>
          <Text style={styles.screenTitle}>Lịch sử học tập</Text>
          <Text style={styles.sessionCountText}>
            {filteredSessions.length} phiên học
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          data={FILTER_TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(tab) => tab.key}
          contentContainerStyle={styles.filterListContent}
          renderItem={({ item: tab }) => {
            const isSelected = selectedFilter === tab.key;
            return (
              <TouchableOpacity
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => handleFilterSelect(tab.key)}
                activeOpacity={0.8}>
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextActive,
                  ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  );

  const renderEmptyOrError = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4255FF" />
          <Text style={styles.loadingText}>Đang tải lịch sử học tập...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Đã xảy ra lỗi</Text>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
          <View style={styles.errorBtnRow}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchSessions(false)}
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

    return (
      <View style={styles.centerBox}>
        <Text style={styles.emptyIcon}>📚</Text>
        <Text style={styles.emptyTitle}>Bạn chưa có phiên học nào.</Text>
        <Text style={styles.emptySubtitle}>
          Bắt đầu học để lịch sử học tập xuất hiện ở đây.
        </Text>
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => router.push('/(tabs)/library' as any)}
          activeOpacity={0.85}>
          <Text style={styles.exploreButtonText}>Khám phá Study Sets →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={loading || errorMessage ? [] : filteredSessions}
        keyExtractor={(item) => String(item.session_id)}
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
    paddingBottom: 32,
  },
  listHeader: {
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
  sessionCountText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  filterContainer: {
    marginTop: 4,
  },
  filterListContent: {
    gap: 8,
    paddingVertical: 4,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#4255FF',
    borderColor: '#4255FF',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E3856',
    flex: 1,
    marginRight: 8,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  modeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 10,
    fontWeight: '500',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  metricTextScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  metricDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusCompleted: {
    backgroundColor: '#DCFCE7',
  },
  statusCompletedText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  statusInProgress: {
    backgroundColor: '#FEF3C7',
  },
  statusInProgressText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  arrowText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#94A3B8',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 6,
  },
  errorMessageText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  errorBtnRow: {
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
