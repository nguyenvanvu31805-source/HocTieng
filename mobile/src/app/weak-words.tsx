import React, { useState, useCallback, useRef } from 'react';
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
import { WeakCard, WeakFilterType } from '@/types/cardProgress';
import cardProgressService from '@/services/cardProgressService';
import { playAudio } from '@/utils/audioPlayer';

export default function WeakWordsScreen() {
  const router = useRouter();

  const [filter, setFilter] = useState<WeakFilterType>('all');
  const [items, setItems] = useState<WeakCard[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isFetchingRef = useRef(false);

  const fetchCards = useCallback(
    async (targetPage = 1, targetFilter = filter, isRefresh = false) => {
      if (isFetchingRef.current && !isRefresh) return;
      isFetchingRef.current = true;

      if (targetPage === 1 && !isRefresh) {
        setLoading(true);
      } else if (targetPage > 1) {
        setLoadingMore(true);
      }
      setErrorMessage('');

      try {
        const res = await cardProgressService.getWeakCards({
          filter: targetFilter,
          page: targetPage,
          limit: 20,
        });

        if (res) {
          if (targetPage === 1) {
            setItems(res.items || []);
          } else {
            setItems((prev) => [...prev, ...(res.items || [])]);
          }
          setPage(res.pagination.page);
          setTotalPages(res.pagination.total_pages);
          setTotalCount(res.summary.total_weak_cards);
        } else {
          if (targetPage === 1) setItems([]);
        }
      } catch (err: any) {
        setErrorMessage(
          err?.data?.message || err?.message || 'Không thể tải danh sách từ yếu.',
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
        isFetchingRef.current = false;
      }
    },
    [filter],
  );

  // Tự động tải lại dữ liệu mỗi khi màn hình được Focus
  useFocusEffect(
    useCallback(() => {
      fetchCards(1, filter, true);
    }, [fetchCards, filter]),
  );

  const handleFilterChange = (newFilter: WeakFilterType) => {
    if (newFilter === filter) return;
    setFilter(newFilter);
    setPage(1);
    fetchCards(1, newFilter, false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCards(1, filter, true);
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || isFetchingRef.current) return;
    if (page < totalPages) {
      fetchCards(page + 1, filter, false);
    }
  };

  const renderFilterChips = () => (
    <View style={styles.filterRow}>
      <TouchableOpacity
        style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
        onPress={() => handleFilterChange('all')}
        activeOpacity={0.8}>
        <Text
          style={[
            styles.filterChipText,
            filter === 'all' && styles.filterChipTextActive,
          ]}>
          Tất cả
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterChip, filter === 'most_wrong' && styles.filterChipActive]}
        onPress={() => handleFilterChange('most_wrong')}
        activeOpacity={0.8}>
        <Text
          style={[
            styles.filterChipText,
            filter === 'most_wrong' && styles.filterChipTextActive,
          ]}>
          Sai nhiều
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterChip, filter === 'low_mastery' && styles.filterChipActive]}
        onPress={() => handleFilterChange('low_mastery')}
        activeOpacity={0.8}>
        <Text
          style={[
            styles.filterChipText,
            filter === 'low_mastery' && styles.filterChipTextActive,
          ]}>
          Mastery thấp
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCardItem = ({ item }: { item: WeakCard }) => (
    <View style={styles.cardItem}>
      {/* Set Badge & Audio */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.setTag}>
          <Text style={styles.setTagText} numberOfLines={1}>
            📁 {item.set_title}
          </Text>
        </View>

        {Boolean(item.audio_url && item.audio_url.trim()) && (
          <TouchableOpacity
            style={styles.audioBtn}
            onPress={() => playAudio(item.audio_url)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.audioBtnText}>🔊 Phát âm</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Term & Pronunciation */}
      <Text style={styles.cardTerm}>{item.term}</Text>
      {Boolean(item.pronunciation && item.pronunciation.trim()) && (
        <Text style={styles.cardPronunciation}>{item.pronunciation?.trim()}</Text>
      )}

      {/* Definition */}
      <Text style={styles.cardDefinition}>{item.definition}</Text>

      {/* Example (nếu có) */}
      {Boolean(item.example && item.example.trim()) && (
        <View style={styles.cardExampleBox}>
          <Text style={styles.exampleLabel}>💬 Ví dụ:</Text>
          <Text style={styles.exampleText}>"{item.example?.trim()}"</Text>
        </View>
      )}

      {/* Stats Row & Action Button */}
      <View style={styles.cardFooterRow}>
        <View style={styles.statsGroup}>
          <View style={styles.wrongBadge}>
            <Text style={styles.wrongBadgeText}>❌ {item.wrong_count} sai</Text>
          </View>
          <View style={styles.correctBadge}>
            <Text style={styles.correctBadgeText}>✅ {item.correct_count} đúng</Text>
          </View>
          <View style={styles.masteryBadge}>
            <Text style={styles.masteryBadgeText}>Mastery: {item.mastery_level}/3</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.singleReviewBtn}
          onPress={() =>
            router.push({
              pathname: '/review/weak',
              params: { cardId: String(item.card_id) },
            } as any)
          }
          activeOpacity={0.8}>
          <Text style={styles.singleReviewBtnText}>⚡ Ôn từ này</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.headerSubtitle}>
        Bạn có <Text style={styles.highlightCount}>{totalCount}</Text> từ cần ôn lại
      </Text>

      {totalCount > 0 && (
        <TouchableOpacity
          style={styles.reviewAllBtn}
          onPress={() => router.push('/review/weak' as any)}
          activeOpacity={0.85}>
          <Text style={styles.reviewAllBtnText}>⚡ Ôn tập tất cả từ yếu ({totalCount} từ)</Text>
        </TouchableOpacity>
      )}

      {renderFilterChips()}
    </View>
  );

  const renderEmptyState = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🎉</Text>
        <Text style={styles.emptyTitle}>Tuyệt vời!</Text>
        <Text style={styles.emptySubtitle}>
          Hiện tại bạn không có từ yếu cần ôn. Tiếp tục học để duy trì tiến độ nhé!
        </Text>
        <TouchableOpacity
          style={styles.exploreBtn}
          onPress={() => router.push('/(tabs)/library' as any)}
          activeOpacity={0.85}>
          <Text style={styles.exploreBtnText}>📚 Khám phá bộ học</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMoreBox}>
        <ActivityIndicator size="small" color="#EA580C" />
        <Text style={styles.loadingMoreText}>Đang tải thêm...</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Bar Navigation */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnArrow}>←</Text>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>⚠️ Từ yếu</Text>
        <View style={{ width: 70 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Đang tải danh sách từ yếu...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Đã xảy ra lỗi</Text>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchCards(1, filter, false)}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.card_id)}
          renderItem={renderCardItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#EA580C']}
              tintColor="#EA580C"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 70,
    paddingVertical: 4,
  },
  backBtnArrow: {
    fontSize: 20,
    color: '#4255FF',
    fontWeight: '700',
    marginRight: 4,
  },
  backBtnText: {
    fontSize: 15,
    color: '#4255FF',
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  listHeader: {
    paddingTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 14,
  },
  highlightCount: {
    color: '#EA580C',
    fontWeight: '800',
    fontSize: 18,
  },
  reviewAllBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  reviewAllBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterChipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  setTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: '65%',
  },
  setTagText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  audioBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4255FF',
  },
  cardTerm: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  cardPronunciation: {
    fontSize: 13,
    color: '#4255FF',
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: 6,
  },
  cardDefinition: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 21,
    fontWeight: '500',
    marginTop: 4,
  },
  cardExampleBox: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#EA580C',
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EA580C',
    marginBottom: 2,
  },
  exampleText: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  cardFooterRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statsGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  wrongBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  wrongBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  correctBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  correctBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  masteryBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  masteryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  singleReviewBtn: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  singleReviewBtnText: {
    color: '#EA580C',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyEmoji: {
    fontSize: 54,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  exploreBtn: {
    backgroundColor: '#4255FF',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  loadingMoreBox: {
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  errorMessageText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
