import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import studySetService from '@/services/studySetService';
import cardService from '@/services/cardService';
import cardProgressService from '@/services/cardProgressService';
import bookmarkService from '@/services/bookmarkService';
import FlashcardPreview from '@/components/FlashcardPreview';

export default function StudySetDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();

  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [progress, setProgress] = useState<StudySetProgress | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Quyền sở hữu bộ học: là người tạo (creator_id) hoặc vai trò ADMIN
  const isOwner = Boolean(
    user &&
      studySet &&
      (Number(studySet.creator_id) === Number(user.user_id) || user.role === 'ADMIN'),
  );

  // State: Chỉnh sửa bộ học
  const [editSetModalVisible, setEditSetModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editVisibility, setEditVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [savingSet, setSavingSet] = useState(false);
  const [editSetError, setEditSetError] = useState('');

  // State: Xóa bộ học
  const [deletingSet, setDeletingSet] = useState(false);

  // State: Thêm thẻ mới
  const [addCardModalVisible, setAddCardModalVisible] = useState(false);
  const [newCardTerm, setNewCardTerm] = useState('');
  const [newCardDef, setNewCardDef] = useState('');
  const [newCardPronunciation, setNewCardPronunciation] = useState('');
  const [newCardExample, setNewCardExample] = useState('');
  const [savingCard, setSavingCard] = useState(false);
  const [addCardError, setAddCardError] = useState('');

  // State: Sửa thẻ
  const [editCardModalVisible, setEditCardModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [editCardTerm, setEditCardTerm] = useState('');
  const [editCardDef, setEditCardDef] = useState('');
  const [editCardPronunciation, setEditCardPronunciation] = useState('');
  const [editCardExample, setEditCardExample] = useState('');
  const [editingCardLoading, setEditingCardLoading] = useState(false);
  const [editCardError, setEditCardError] = useState('');

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

  // --- Handlers: Quản lý Bộ học (Edit & Delete Study Set) ---
  const handleOpenEditSetModal = () => {
    if (!studySet) return;
    setEditTitle(studySet.title || '');
    setEditDescription(studySet.description || '');
    setEditCategory(studySet.category || '');
    setEditVisibility(studySet.visibility || 'PUBLIC');
    setEditSetError('');
    setEditSetModalVisible(true);
  };

  const handleSaveEditSet = async () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setEditSetError('Vui lòng nhập tên bộ học.');
      return;
    }

    setSavingSet(true);
    setEditSetError('');

    try {
      const res = await studySetService.updateStudySet(id, {
        title: trimmedTitle,
        description: editDescription.trim() || null,
        category: editCategory.trim() || null,
        visibility: editVisibility,
      });

      if (res.success && res.data) {
        setStudySet(res.data);
        setEditSetModalVisible(false);
        Alert.alert('Thành công', 'Đã cập nhật bộ học!');
      } else {
        setEditSetError(res.message || 'Không thể cập nhật bộ học.');
      }
    } catch (error: any) {
      const msg =
        error?.status === 401
          ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : error?.status === 403
          ? 'Bạn không có quyền chỉnh sửa bộ học này.'
          : error?.data?.message || error?.message || 'Không thể cập nhật bộ học.';
      setEditSetError(msg);
    } finally {
      setSavingSet(false);
    }
  };

  const handleDeleteStudySet = () => {
    Alert.alert(
      'Xác nhận xóa bộ học',
      'Bạn có chắc muốn xóa bộ học này không? Toàn bộ thẻ từ vựng sẽ bị xóa vĩnh viễn và không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa bộ học',
          style: 'destructive',
          onPress: async () => {
            setDeletingSet(true);
            try {
              await studySetService.deleteStudySet(id);
              Alert.alert('Đã xóa', 'Bộ học đã được xóa thành công.', [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(tabs)/library'),
                },
              ]);
            } catch (error: any) {
              const msg =
                error?.status === 401
                  ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
                  : error?.status === 403
                  ? 'Bạn không có quyền xóa bộ học này.'
                  : error?.data?.message || error?.message || 'Không thể xóa bộ học.';
              Alert.alert('Lỗi', msg);
            } finally {
              setDeletingSet(false);
            }
          },
        },
      ],
    );
  };

  // --- Handlers: Quản lý Thẻ từ vựng (Create, Edit & Delete Cards) ---
  const handleOpenAddCardModal = () => {
    setNewCardTerm('');
    setNewCardDef('');
    setNewCardPronunciation('');
    setNewCardExample('');
    setAddCardError('');
    setAddCardModalVisible(true);
  };

  const handleCreateCardSubmit = async () => {
    const term = newCardTerm.trim();
    const definition = newCardDef.trim();
    if (!term) {
      setAddCardError('Vui lòng nhập thuật ngữ / từ vựng.');
      return;
    }
    if (!definition) {
      setAddCardError('Vui lòng nhập định nghĩa / giải nghĩa.');
      return;
    }

    setSavingCard(true);
    setAddCardError('');

    try {
      const res = await cardService.createCard(id, {
        term,
        definition,
        pronunciation: newCardPronunciation.trim() || null,
        example: newCardExample.trim() || null,
      });

      if (res.success && res.data) {
        setCards((prev) => [...prev, res.data]);
        setStudySet((prev) =>
          prev ? { ...prev, card_count: (prev.card_count || 0) + 1 } : null,
        );
        setAddCardModalVisible(false);
        Alert.alert('Thành công', 'Đã thêm thẻ mới vào bộ học!');
      } else {
        setAddCardError(res.message || 'Không thể tạo thẻ mới.');
      }
    } catch (error: any) {
      const msg =
        error?.status === 401
          ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : error?.status === 403
          ? 'Bạn không có quyền thêm thẻ vào bộ học này.'
          : error?.data?.message || error?.message || 'Không thể tạo thẻ mới.';
      setAddCardError(msg);
    } finally {
      setSavingCard(false);
    }
  };

  const handleOpenEditCardModal = (card: Card) => {
    setSelectedCard(card);
    setEditCardTerm(card.term);
    setEditCardDef(card.definition);
    setEditCardPronunciation(card.pronunciation || '');
    setEditCardExample(card.example || '');
    setEditCardError('');
    setEditCardModalVisible(true);
  };

  const handleSaveEditCard = async () => {
    if (!selectedCard) return;
    const term = editCardTerm.trim();
    const definition = editCardDef.trim();
    if (!term) {
      setEditCardError('Vui lòng nhập thuật ngữ / từ vựng.');
      return;
    }
    if (!definition) {
      setEditCardError('Vui lòng nhập định nghĩa / giải nghĩa.');
      return;
    }

    setEditingCardLoading(true);
    setEditCardError('');

    try {
      const res = await cardService.updateCard(selectedCard.card_id, {
        term,
        definition,
        pronunciation: editCardPronunciation.trim() || null,
        example: editCardExample.trim() || null,
      });

      if (res.success && res.data) {
        setCards((prev) =>
          prev.map((c) => (c.card_id === selectedCard.card_id ? res.data : c)),
        );
        setEditCardModalVisible(false);
        setSelectedCard(null);
        Alert.alert('Thành công', 'Đã cập nhật thẻ từ vựng!');
      } else {
        setEditCardError(res.message || 'Không thể cập nhật thẻ.');
      }
    } catch (error: any) {
      const msg =
        error?.status === 401
          ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : error?.status === 403
          ? 'Bạn không có quyền chỉnh sửa thẻ này.'
          : error?.data?.message || error?.message || 'Không thể cập nhật thẻ.';
      setEditCardError(msg);
    } finally {
      setEditingCardLoading(false);
    }
  };

  const handleDeleteCard = (card: Card) => {
    Alert.alert(
      'Xác nhận xóa thẻ',
      `Bạn có chắc muốn xóa thẻ "${card.term}" không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await cardService.deleteCard(card.card_id);
              setCards((prev) => prev.filter((c) => c.card_id !== card.card_id));
              setStudySet((prev) =>
                prev
                  ? { ...prev, card_count: Math.max(0, (prev.card_count || 1) - 1) }
                  : null,
              );
              Alert.alert('Thành công', 'Đã xóa thẻ từ vựng.');
            } catch (error: any) {
              const msg =
                error?.status === 401
                  ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
                  : error?.status === 403
                  ? 'Bạn không có quyền xóa thẻ này.'
                  : error?.data?.message || error?.message || 'Không thể xóa thẻ.';
              Alert.alert('Lỗi', msg);
            }
          },
        },
      ],
    );
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

        {/* Khối quản lý dành cho chủ sở hữu bộ học */}
        {isOwner && (
          <View style={styles.ownerControlsCard}>
            <View style={styles.ownerControlsHeader}>
              <Text style={styles.ownerControlsTitle}>⚙️ Quản lý bộ học của bạn</Text>
            </View>
            <View style={styles.ownerButtonsRow}>
              <TouchableOpacity
                style={styles.editSetButton}
                onPress={handleOpenEditSetModal}
                activeOpacity={0.8}>
                <Text style={styles.editSetButtonIcon}>✏️</Text>
                <Text style={styles.editSetButtonText}>Chỉnh sửa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteSetButton}
                onPress={handleDeleteStudySet}
                disabled={deletingSet}
                activeOpacity={0.8}>
                {deletingSet ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <>
                    <Text style={styles.deleteSetButtonIcon}>🗑️</Text>
                    <Text style={styles.deleteSetButtonText}>Xóa bộ học</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

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

        {/* Nút Chế độ Học (Learn Mode) - hiển thị khi có thẻ */}
        {cards.length > 0 && (
          <TouchableOpacity
            style={styles.learnActionButton}
            onPress={() => router.push(`/study-set/${id}/learn` as any)}
            activeOpacity={0.8}>
            <Text style={styles.learnActionIcon}>📚</Text>
            <View style={styles.learnActionTextBox}>
              <Text style={styles.learnActionTitle}>Học (Learn Mode)</Text>
              <Text style={styles.learnActionSubtitle}>
                Ghi nhớ định nghĩa từ vựng từng bước với phản hồi ngay
              </Text>
            </View>
            <Text style={styles.learnActionArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Hàng nút hành động Flashcards & Luyện tập */}
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
            <Text style={styles.primaryActionText}>Flashcards</Text>
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
          <View style={styles.cardsSectionTitleRow}>
            <Text style={styles.cardsSectionTitle}>Từ vựng trong bộ này</Text>
            <Text style={styles.cardsSectionSubtitle}>({cards.length} thẻ)</Text>
          </View>
          {isOwner && (
            <TouchableOpacity
              style={styles.addCardButton}
              onPress={handleOpenAddCardModal}
              activeOpacity={0.8}>
              <Text style={styles.addCardButtonIcon}>＋</Text>
              <Text style={styles.addCardButtonText}>Thêm thẻ</Text>
            </TouchableOpacity>
          )}
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
          {isOwner
            ? 'Bộ học của bạn chưa có từ vựng nào. Hãy bấm "+ Thêm thẻ" để bắt đầu!'
            : 'Bộ học này hiện tại chưa có từ vựng nào được thêm vào.'}
        </Text>
        {isOwner && (
          <TouchableOpacity
            style={styles.emptyAddCardBtn}
            onPress={handleOpenAddCardModal}
            activeOpacity={0.8}>
            <Text style={styles.emptyAddCardBtnText}>＋ Thêm thẻ đầu tiên</Text>
          </TouchableOpacity>
        )}
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
            canEdit={isOwner}
            onEdit={handleOpenEditCardModal}
            onDelete={handleDeleteCard}
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

      {/* Modal Chỉnh sửa bộ học */}
      <Modal
        visible={editSetModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!savingSet) setEditSetModalVisible(false);
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa bộ học</Text>
              <Text style={styles.modalSubtitle}>
                Cập nhật thông tin chi tiết của bộ học này.
              </Text>
            </View>

            {!!editSetError && (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{editSetError}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>
                Tên bộ học <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.formInput}
                placeholder="Tên bộ học..."
                placeholderTextColor="#939BB4"
                value={editTitle}
                onChangeText={setEditTitle}
                editable={!savingSet}
              />

              <Text style={styles.inputLabel}>Mô tả (tùy chọn)</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMulti]}
                placeholder="Mô tả bộ học..."
                placeholderTextColor="#939BB4"
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!savingSet}
              />

              <Text style={styles.inputLabel}>Chủ đề (tùy chọn)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ví dụ: Tiếng Anh, Từ vựng, Công nghệ..."
                placeholderTextColor="#939BB4"
                value={editCategory}
                onChangeText={setEditCategory}
                editable={!savingSet}
              />

              <Text style={styles.inputLabel}>Quyền riêng tư</Text>
              <View style={styles.visibilityRow}>
                <TouchableOpacity
                  style={[
                    styles.visibilityBtn,
                    editVisibility === 'PUBLIC' && styles.visibilityBtnActive,
                  ]}
                  onPress={() => setEditVisibility('PUBLIC')}
                  disabled={savingSet}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.visibilityBtnText,
                      editVisibility === 'PUBLIC' && styles.visibilityBtnTextActive,
                    ]}>
                    🌐 Công khai
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.visibilityBtn,
                    editVisibility === 'PRIVATE' && styles.visibilityBtnActive,
                  ]}
                  onPress={() => setEditVisibility('PRIVATE')}
                  disabled={savingSet}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.visibilityBtnText,
                      editVisibility === 'PRIVATE' && styles.visibilityBtnTextActive,
                    ]}>
                    🔒 Riêng tư
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditSetModalVisible(false)}
                disabled={savingSet}
                activeOpacity={0.7}>
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, savingSet && styles.modalSubmitBtnDisabled]}
                onPress={handleSaveEditSet}
                disabled={savingSet}
                activeOpacity={0.8}>
                {savingSet ? (
                  <View style={styles.submitLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Đang lưu...</Text>
                  </View>
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Thêm thẻ từ vựng mới */}
      <Modal
        visible={addCardModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!savingCard) setAddCardModalVisible(false);
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm thẻ từ vựng</Text>
              <Text style={styles.modalSubtitle}>
                Thêm thuật ngữ và định nghĩa mới vào bộ học.
              </Text>
            </View>

            {!!addCardError && (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{addCardError}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>
                Thuật ngữ / Từ vựng <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ví dụ: Apple, Eloquent, Algorithm..."
                placeholderTextColor="#939BB4"
                value={newCardTerm}
                onChangeText={setNewCardTerm}
                editable={!savingCard}
              />

              <Text style={styles.inputLabel}>
                Định nghĩa / Nghĩa <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.formInput, styles.formInputMulti]}
                placeholder="Ví dụ: Quả táo, Có tài hùng biện..."
                placeholderTextColor="#939BB4"
                value={newCardDef}
                onChangeText={setNewCardDef}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                editable={!savingCard}
              />

              <Text style={styles.inputLabel}>Phiên âm (tùy chọn)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ví dụ: /ˈæp.əl/"
                placeholderTextColor="#939BB4"
                value={newCardPronunciation}
                onChangeText={setNewCardPronunciation}
                editable={!savingCard}
              />

              <Text style={styles.inputLabel}>Câu ví dụ (tùy chọn)</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMulti]}
                placeholder="Ví dụ: She ate a fresh apple for breakfast."
                placeholderTextColor="#939BB4"
                value={newCardExample}
                onChangeText={setNewCardExample}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                editable={!savingCard}
              />
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAddCardModalVisible(false)}
                disabled={savingCard}
                activeOpacity={0.7}>
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, savingCard && styles.modalSubmitBtnDisabled]}
                onPress={handleCreateCardSubmit}
                disabled={savingCard}
                activeOpacity={0.8}>
                {savingCard ? (
                  <View style={styles.submitLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Đang thêm...</Text>
                  </View>
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Thêm thẻ</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Sửa thẻ từ vựng */}
      <Modal
        visible={editCardModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!editingCardLoading) setEditCardModalVisible(false);
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sửa thẻ từ vựng</Text>
              <Text style={styles.modalSubtitle}>
                Cập nhật thông tin cho thẻ từ vựng đã chọn.
              </Text>
            </View>

            {!!editCardError && (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{editCardError}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>
                Thuật ngữ / Từ vựng <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.formInput}
                placeholder="Thuật ngữ / Từ vựng..."
                placeholderTextColor="#939BB4"
                value={editCardTerm}
                onChangeText={setEditCardTerm}
                editable={!editingCardLoading}
              />

              <Text style={styles.inputLabel}>
                Định nghĩa / Nghĩa <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.formInput, styles.formInputMulti]}
                placeholder="Định nghĩa / Nghĩa..."
                placeholderTextColor="#939BB4"
                value={editCardDef}
                onChangeText={setEditCardDef}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                editable={!editingCardLoading}
              />

              <Text style={styles.inputLabel}>Phiên âm (tùy chọn)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Phiên âm..."
                placeholderTextColor="#939BB4"
                value={editCardPronunciation}
                onChangeText={setEditCardPronunciation}
                editable={!editingCardLoading}
              />

              <Text style={styles.inputLabel}>Câu ví dụ (tùy chọn)</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMulti]}
                placeholder="Ví dụ minh họa..."
                placeholderTextColor="#939BB4"
                value={editCardExample}
                onChangeText={setEditCardExample}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                editable={!editingCardLoading}
              />
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditCardModalVisible(false)}
                disabled={editingCardLoading}
                activeOpacity={0.7}>
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  editingCardLoading && styles.modalSubmitBtnDisabled,
                ]}
                onPress={handleSaveEditCard}
                disabled={editingCardLoading}
                activeOpacity={0.8}>
                {editingCardLoading ? (
                  <View style={styles.submitLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Đang lưu...</Text>
                  </View>
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Lưu thẻ</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  learnActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4255FF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  learnActionIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  learnActionTextBox: {
    flex: 1,
  },
  learnActionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  learnActionSubtitle: {
    color: '#E0E7FF',
    fontSize: 12,
    fontWeight: '500',
  },
  learnActionArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
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
  ownerControlsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginBottom: 18,
  },
  ownerControlsHeader: {
    marginBottom: 10,
  },
  ownerControlsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60646C',
    textTransform: 'uppercase',
  },
  ownerButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editSetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    borderRadius: 10,
  },
  editSetButtonIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  editSetButtonText: {
    color: '#4255FF',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteSetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 10,
  },
  deleteSetButtonIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  deleteSetButtonText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  cardsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardsSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4255FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  addCardButtonIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 4,
  },
  addCardButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyAddCardBtn: {
    marginTop: 14,
    backgroundColor: '#4255FF',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  emptyAddCardBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    maxHeight: '85%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#60646C',
    lineHeight: 18,
  },
  formErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  formErrorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 6,
    marginTop: 10,
  },
  requiredStar: {
    color: '#DC2626',
  },
  formInput: {
    backgroundColor: '#F8F9FD',
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2E3856',
  },
  formInputMulti: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  visibilityBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    backgroundColor: '#F8F9FD',
  },
  visibilityBtnActive: {
    borderColor: '#4255FF',
    backgroundColor: '#EEF2FF',
  },
  visibilityBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#60646C',
  },
  visibilityBtnTextActive: {
    color: '#4255FF',
    fontWeight: '700',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F7',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F0F2F7',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#60646C',
  },
  modalSubmitBtn: {
    flex: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#4255FF',
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#939BB4',
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

