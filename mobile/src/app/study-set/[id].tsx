import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { StudySet } from '@/types/studySet';
import { Card } from '@/types/card';
import { StudySetProgress } from '@/types/cardProgress';
import api from '@/services/api';
import cardProgressService from '@/services/cardProgressService';
import bookmarkService from '@/services/bookmarkService';
import FlashcardPreview from '@/components/FlashcardPreview';

export default function StudySetDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useAuth();

  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [progress, setProgress] = useState<StudySetProgress | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchDetailAndCards = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (!isRefresh) setLoading(true);
    setErrorMessage('');

    try {
      // 1. Gọi song song cả API chi tiết bộ học, danh sách cards, tiến độ học và trạng thái bookmark
      const [setResponse, cardsResponse, progressResponse, bookmarkStatus] = await Promise.all([
        api.get<StudySet>(`/study-sets/${id}`),
        api.get<Card[]>(`/study-sets/${id}/cards`),
        cardProgressService.getStudySetProgress(id),
        isAuthenticated ? bookmarkService.getBookmarkStatus(id) : Promise.resolve(false),
      ]);

      if (setResponse.success && setResponse.data) {
        setStudySet(setResponse.data);
      } else {
        throw new Error(setResponse.message || 'Không tìm thấy bộ học.');
      }

      if (cardsResponse.success && Array.isArray(cardsResponse.data)) {
        setCards(cardsResponse.data);
      } else {
        setCards([]);
      }

      if (progressResponse) {
        setProgress(progressResponse);
      }

      setIsBookmarked(Boolean(bookmarkStatus));
    } catch (error: any) {
      const msg =
        error?.status === 404
          ? 'Bộ học không tồn tại hoặc đã bị xóa.'
          : error?.data?.message ||
            error?.message ||
            'Không thể tải chi tiết bộ học. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetailAndCards();
  }, [fetchDetailAndCards]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDetailAndCards(true);
  };

  const handleToggleBookmark = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập để lưu bộ học vào thư viện cá nhân.',
      );
      return;
    }

    if (bookmarkLoading) return;
    setBookmarkLoading(true);

    try {
      const serverStatus = await bookmarkService.toggleBookmark(id, isBookmarked);
      setIsBookmarked(serverStatus);
    } catch (error: any) {
      Alert.alert(
        'Lỗi lưu bộ học',
        error?.data?.message ||
          error?.message ||
          'Không thể cập nhật trạng thái lưu bộ học. Vui lòng thử lại.',
      );
    } finally {
      setBookmarkLoading(false);
    }
  };

  const creatorName =
    studySet?.creator_full_name ||
    studySet?.creator_username ||
    `Người dùng #${studySet?.creator_id}`;
  const initialLetter = (creatorName[0] || 'U').toUpperCase();
  const studiedIds = new Set(progress?.records?.map((r) => r.card_id) || []);

  // Header của FlatList
  const renderHeader = () => {
    if (!studySet) return null;

    return (
      <View style={styles.headerContainer}>
        {/* Badges: Danh mục & Ngôn ngữ & Số thẻ */}
        <View style={styles.metaBadgesRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{studySet.category || 'Từ vựng'}</Text>
          </View>
          <View style={styles.langBadge}>
            <Text style={styles.langText}>{studySet.language || 'English'}</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {cards.length > 0 ? cards.length : studySet.card_count || 0} thẻ
            </Text>
          </View>
        </View>

        {/* Tiêu đề bộ học */}
        <Text style={styles.studySetTitle}>{studySet.title}</Text>

        {/* Mô tả bộ học */}
        {!!studySet.description && (
          <Text style={styles.studySetDescription}>{studySet.description}</Text>
        )}

        {/* Nút Bookmark bộ học */}
        <TouchableOpacity
          style={[
            styles.bookmarkActionButton,
            isBookmarked && styles.bookmarkActionButtonActive,
          ]}
          onPress={handleToggleBookmark}
          disabled={bookmarkLoading}
          activeOpacity={0.8}>
          {bookmarkLoading ? (
            <ActivityIndicator
              size="small"
              color={isBookmarked ? '#15803D' : '#4255FF'}
            />
          ) : (
            <>
              <Text style={styles.bookmarkActionIcon}>
                {isBookmarked ? '🔖' : '🔖'}
              </Text>
              <Text
                style={[
                  styles.bookmarkActionText,
                  isBookmarked && styles.bookmarkActionTextActive,
                ]}>
                {isBookmarked ? 'Đã lưu vào Thư viện' : 'Lưu bộ học'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Thông tin tác giả & Ngày cập nhật */}
        <View style={styles.creatorCard}>
          <View style={styles.creatorLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialLetter}</Text>
            </View>
            <View>
              <Text style={styles.creatorTitleLabel}>Tác giả</Text>
              <Text style={styles.creatorNameText}>{creatorName}</Text>
            </View>
          </View>
          <Text style={styles.dateText}>
            {new Date(studySet.updated_at || studySet.created_at).toLocaleDateString('vi-VN')}
          </Text>
        </View>

        {/* Khối hiển thị tiến độ học của người dùng (nếu đã học) */}
        {!!progress && progress.studied_cards > 0 && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeaderRow}>
              <View style={styles.progressTitleBox}>
                <Text style={styles.progressEmoji}>📊</Text>
                <Text style={styles.progressTitle}>Tiến độ học tập</Text>
              </View>
              <Text style={styles.progressPercentBadge}>
                {progress.progress_percent}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progress.progress_percent}%` },
                ]}
              />
            </View>
            <Text style={styles.progressSubText}>
              Đã học {progress.studied_cards} / {cards.length || progress.total_cards} thẻ
            </Text>
          </View>
        )}

        {/* Hàng nút hành động chuẩn bị cho bước tiếp theo */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => {
              if (cards.length === 0) {
                Alert.alert(
                  'Thông báo',
                  'Bộ học này hiện tại chưa có thẻ từ vựng nào để học.',
                );
                return;
              }
              router.push(`/study-set/${id}/flashcards` as any);
            }}
            activeOpacity={0.8}>
            <Text style={styles.primaryActionIcon}>🗂️</Text>
            <Text style={styles.primaryActionText}>Học Flashcards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => {
              if (cards.length === 0) {
                Alert.alert(
                  'Thông báo',
                  'Bộ học này hiện tại chưa có thẻ từ vựng nào để làm bài kiểm tra.',
                );
                return;
              }
              router.push(`/study-set/${id}/test` as any);
            }}
            activeOpacity={0.8}>
            <Text style={styles.secondaryActionIcon}>✍️</Text>
            <Text style={styles.secondaryActionText}>Luyện tập</Text>
          </TouchableOpacity>
        </View>

        {/* Nút Ghép thẻ (Match) */}
        <TouchableOpacity
          style={styles.matchActionButton}
          onPress={() => {
            if (cards.length < 2) {
              Alert.alert(
                'Thông báo',
                'Bộ học này cần có ít nhất 2 thẻ từ vựng để chơi Ghép thẻ.',
              );
              return;
            }
            router.push(`/study-set/${id}/match` as any);
          }}
          activeOpacity={0.8}>
          <Text style={styles.matchActionIcon}>🎮</Text>
          <Text style={styles.matchActionText}>Ghép thẻ (Match)</Text>
        </TouchableOpacity>

        {/* Tiêu đề danh sách thẻ */}
        <View style={styles.cardsSectionHeader}>
          <Text style={styles.cardsSectionTitle}>Từ vựng trong bộ này</Text>
          <Text style={styles.cardsSectionSubtitle}>({cards.length} thẻ)</Text>
        </View>
      </View>
    );
  };

  // Trạng thái Loading / Lỗi / Trống
  const renderEmptyOrError = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4255FF" />
          <Text style={styles.loadingText}>Đang tải chi tiết bộ học...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Không thể tải bộ học</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <View style={styles.errorButtonsRow}>
            <TouchableOpacity
              style={styles.backActionButton}
              onPress={() => router.back()}>
              <Text style={styles.backActionText}>Quay lại</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.retryActionButton}
              onPress={() => fetchDetailAndCards(false)}>
              <Text style={styles.retryActionText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.centerBox}>
        <Text style={styles.stateIcon}>📝</Text>
        <Text style={styles.emptyTitle}>Chưa có thẻ từ vựng</Text>
        <Text style={styles.emptySubtitle}>
          Bộ học này hiện tại chưa có từ vựng nào được thêm vào.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Thanh điều hướng trên cùng (Top Navigation Bar) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Text style={styles.backButtonArrow}>←</Text>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {studySet?.title || 'Chi tiết bộ học'}
        </Text>
        <TouchableOpacity
          style={[
            styles.topBarBookmarkBtn,
            isBookmarked && styles.topBarBookmarkedBtn,
          ]}
          onPress={handleToggleBookmark}
          disabled={bookmarkLoading}
          activeOpacity={0.7}>
          {bookmarkLoading ? (
            <ActivityIndicator
              size="small"
              color={isBookmarked ? '#15803D' : '#4255FF'}
            />
          ) : (
            <Text
              style={[
                styles.topBarBookmarkText,
                isBookmarked && styles.topBarBookmarkedText,
              ]}>
              {isBookmarked ? '🔖 Đã lưu' : '🔖 Lưu'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Danh sách thẻ từ vựng */}
      <FlatList
        data={loading || errorMessage ? [] : cards}
        keyExtractor={(item) => String(item.card_id)}
        renderItem={({ item, index }) => (
          <FlashcardPreview
            card={item}
            index={index}
            isStudied={studiedIds.has(item.card_id)}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF4',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 8,
  },
  backButtonArrow: {
    fontSize: 20,
    color: '#4255FF',
    fontWeight: '700',
    marginRight: 4,
  },
  backButtonText: {
    fontSize: 15,
    color: '#4255FF',
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E3856',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 36,
  },
  headerContainer: {
    paddingTop: 16,
    marginBottom: 8,
  },
  metaBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    color: '#4255FF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  langBadge: {
    backgroundColor: '#F0F2F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  langText: {
    color: '#60646C',
    fontSize: 12,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: '#E6F9F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  studySetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2E3856',
    lineHeight: 32,
    marginBottom: 8,
  },
  studySetDescription: {
    fontSize: 15,
    color: '#60646C',
    lineHeight: 22,
    marginBottom: 16,
  },
  creatorCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginBottom: 18,
  },
  creatorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4255FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  creatorTitleLabel: {
    fontSize: 11,
    color: '#939BB4',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  creatorNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E3856',
  },
  dateText: {
    fontSize: 13,
    color: '#939BB4',
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4255FF',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#4255FF',
    paddingVertical: 14,
    borderRadius: 12,
  },
  secondaryActionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  secondaryActionText: {
    color: '#4255FF',
    fontSize: 15,
    fontWeight: '700',
  },
  matchActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  matchActionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  matchActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cardsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardsSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E3856',
    marginRight: 6,
  },
  cardsSectionSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#939BB4',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#60646C',
    fontWeight: '500',
  },
  stateIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D93025',
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backActionButton: {
    backgroundColor: '#E8ECF4',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  backActionText: {
    color: '#2E3856',
    fontSize: 14,
    fontWeight: '600',
  },
  retryActionButton: {
    backgroundColor: '#4255FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  retryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  progressCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginBottom: 18,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E3856',
  },
  progressPercentBadge: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4255FF',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4255FF',
    borderRadius: 4,
  },
  progressSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#60646C',
  },
  topBarBookmarkBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarBookmarkedBtn: {
    backgroundColor: '#E6F9F0',
  },
  topBarBookmarkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4255FF',
  },
  topBarBookmarkedText: {
    color: '#15803D',
  },
  bookmarkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#4255FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  bookmarkActionButtonActive: {
    backgroundColor: '#E6F9F0',
    borderColor: '#15803D',
  },
  bookmarkActionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  bookmarkActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4255FF',
  },
  bookmarkActionTextActive: {
    color: '#15803D',
  },
});
