import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card } from '@/types/card';
import { StudySet } from '@/types/studySet';
import { StudySetProgress } from '@/types/cardProgress';
import api from '@/services/api';
import cardProgressService from '@/services/cardProgressService';
import { playAudio } from '@/utils/audioPlayer';
import useStudySession from '@/hooks/useStudySession';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

export default function FlashcardsScreen() {
  const router = useRouter();
  const { id, filter: initialFilter } = useLocalSearchParams<{ id: string; filter?: string }>();
  const [currentFilter, setCurrentFilter] = useState<string>(initialFilter || 'all');

  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Tiến độ học (Card Progress) từ backend
  const [studyProgress, setStudyProgress] = useState<StudySetProgress | null>(null);
  const [studiedCardIds, setStudiedCardIds] = useState<Set<number>>(new Set());

  // Lưu các card đã gửi API trong phiên hiện tại để tránh request dư thừa
  const reviewedInSession = useRef<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Tích hợp ghi nhận study session và streak
  const { recordCardStudied, completeSession } = useStudySession({
    setId: id,
    mode: 'FLASHCARDS',
  });

  // Giá trị animation xoay 3D (0 -> 180 độ)
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Gọi API lấy thông tin bộ học, danh sách thẻ và tiến độ hiện có
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMessage('');
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
    flipAnim.setValue(0);
    reviewedInSession.current.clear();

    try {
      // 1. Gọi song song thông tin bộ học, danh sách thẻ và tiến độ từ backend
      const cardsEndpoint =
        currentFilter && currentFilter !== 'all'
          ? `/study-sets/${id}/cards?filter=${encodeURIComponent(currentFilter)}`
          : `/study-sets/${id}/cards`;

      const [setRes, cardsRes, progressRes] = await Promise.all([
        api.get<StudySet>(`/study-sets/${id}`),
        api.get<Card[]>(cardsEndpoint),
        cardProgressService.getStudySetProgress(id),
      ]);

      if (setRes.success && setRes.data) {
        setStudySet(setRes.data);
      }

      if (cardsRes.success && Array.isArray(cardsRes.data)) {
        setCards(cardsRes.data);
      } else {
        setCards([]);
      }

      if (progressRes) {
        setStudyProgress(progressRes);
        const studiedSet = new Set(progressRes.records.map((r) => r.card_id));
        setStudiedCardIds(studiedSet);
      }
    } catch (err: any) {
      const msg =
        err?.status === 404
          ? 'Không tìm thấy bộ học hoặc bộ học đã bị xóa.'
          : err?.data?.message ||
            err?.message ||
            'Không thể tải dữ liệu flashcard. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [id, currentFilter, flipAnim]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Ghi nhận tiến độ học của một card vào Backend (Async, Non-blocking)
  const recordCardReview = useCallback(
    async (cardId: number) => {
      if (reviewedInSession.current.has(cardId)) return;
      reviewedInSession.current.add(cardId);

      // Cập nhật Optimistic UI ngay lập tức
      setStudiedCardIds((prev) => new Set(prev).add(cardId));

      // Gọi API POST /progress/cards/:cardId/review trong nền
      try {
        const newRecord = await cardProgressService.reviewCard(cardId, true);
        if (newRecord) {
          setStudyProgress((prev) => {
            const existingRecords = prev?.records ? [...prev.records] : [];
            const idx = existingRecords.findIndex((r) => r.card_id === cardId);
            if (idx >= 0) {
              existingRecords[idx] = newRecord;
            } else {
              existingRecords.push(newRecord);
            }
            const total = cards.length || prev?.total_cards || 0;
            const studiedCount = existingRecords.length;
            return {
              set_id: Number(id),
              total_cards: total,
              studied_cards: studiedCount,
              progress_percent:
                total > 0 ? Math.round((studiedCount / total) * 100) : 0,
              mastery: prev?.mastery || {
                not_started: Math.max(0, total - studiedCount),
                learning: studiedCount,
                basic: 0,
                mastered: 0,
              },
              records: existingRecords,
            };
          });
        }
      } catch {
        // Lỗi mạng hoặc server không làm gián đoạn trải nghiệm người dùng
      }
    },
    [id, cards.length],
  );

  // Xử lý hiệu ứng lật thẻ
  const handleFlipCard = () => {
    if (cards.length === 0) return;

    const currentCard = cards[currentIndex];
    if (currentCard) {
      // Khi lật sang mặt sau để xem định nghĩa, ghi nhận đã học thẻ
      recordCardReview(currentCard.card_id);
    }

    if (isFlipped) {
      Animated.spring(flipAnim, {
        toValue: 0,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
      setIsFlipped(false);
    } else {
      Animated.spring(flipAnim, {
        toValue: 180,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
      setIsFlipped(true);
    }
  };

  // Đặt lại thẻ về mặt trước khi chuyển thẻ
  const resetToFront = () => {
    flipAnim.setValue(0);
    setIsFlipped(false);
  };

  // Sang thẻ tiếp theo: ghi nhận tiến độ card hiện tại và chuyển tiếp
  const handleNext = () => {
    if (cards.length === 0) return;

    const currentCard = cards[currentIndex];
    if (currentCard) {
      recordCardReview(currentCard.card_id);
      recordCardStudied();
    }

    if (currentIndex < cards.length - 1) {
      resetToFront();
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      completeSession({ cardsStudied: cards.length });
    }
  };

  // Quay lại thẻ trước
  const handlePrevious = () => {
    if (currentIndex > 0) {
      resetToFront();
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Học lại từ đầu (giữ nguyên tiến độ đã lưu trong database)
  const handleRestart = () => {
    resetToFront();
    setCurrentIndex(0);
    setIsCompleted(false);
    reviewedInSession.current.clear();
  };

  // Interpolations cho hiệu ứng lật thẻ mượt mà
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
    opacity: frontOpacity,
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
    opacity: backOpacity,
  };

  // Render trạng thái Loading
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <Text style={styles.backButtonArrow}>←</Text>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Học Flashcards</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4255FF" />
          <Text style={styles.loadingText}>Đang tải flashcards & tiến độ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render trạng thái Lỗi
  if (errorMessage) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <Text style={styles.backButtonArrow}>←</Text>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Học Flashcards</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.stateEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Không thể tải flashcards</Text>
          <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.back()}>
              <Text style={styles.secondaryButtonText}>Quay lại</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={fetchData}>
              <Text style={styles.primaryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Render trạng thái không có thẻ
  if (cards.length === 0) {
    const isFiltered = currentFilter && currentFilter !== 'all';
    const filterMessage =
      currentFilter === 'unlearned'
        ? 'Bạn đã học tất cả các từ trong bộ này rồi! 🎉'
        : currentFilter === 'review'
        ? 'Hiện tại không có từ nào cần ôn tập ngay. Bạn đang làm rất tốt! 👏'
        : currentFilter === 'weak'
        ? 'Tuyệt vời! Không có từ nào hay sai cần khắc phục. ✨'
        : currentFilter === 'mastered'
        ? 'Chưa có từ nào đạt mức thành thạo. Hãy tiếp tục học nhé!'
        : 'Bộ học này hiện tại chưa có flashcard nào để học.';

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <Text style={styles.backButtonArrow}>←</Text>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Học Flashcards</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.stateEmoji}>{isFiltered ? '🎯' : '🗂️'}</Text>
          <Text style={styles.emptyTitle}>
            {isFiltered ? 'Không có từ trong phạm vi này' : 'Chưa có thẻ từ vựng'}
          </Text>
          <Text style={styles.stateSubtitle}>{filterMessage}</Text>
          <View style={styles.buttonsRow}>
            {isFiltered && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setCurrentFilter('all')}>
                <Text style={styles.primaryButtonText}>📚 Học tất cả</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={isFiltered ? styles.secondaryButton : styles.primaryButton}
              onPress={() => router.back()}>
              <Text
                style={
                  isFiltered
                    ? styles.secondaryButtonText
                    : styles.primaryButtonText
                }>
                Quay về bộ học
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Dữ liệu tiến độ thực tế phục vụ hiển thị
  const totalCards = cards.length;
  const totalStudied = Math.max(
    studiedCardIds.size,
    studyProgress?.studied_cards || 0,
  );
  const realProgressPercent =
    totalCards > 0 ? Math.round((totalStudied / totalCards) * 100) : 0;

  // Render màn hình Hoàn thành với dữ liệu tiến độ thực tế từ Backend
  if (isCompleted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <Text style={styles.backButtonArrow}>←</Text>
            <Text style={styles.backButtonText}>Đóng</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {studySet?.title || 'Hoàn thành'}
          </Text>
          <View style={{ width: 70 }} />
        </View>

        <View style={styles.completedContainer}>
          <View style={styles.completedCard}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.completedTitle}>Xuất sắc!</Text>
            <Text style={styles.completedSubtitle}>
              Bạn đã ôn tập xong tất cả thẻ từ vựng trong bộ này.
            </Text>

            {/* Thống kê tiến độ thực tế từ Backend */}
            <View style={styles.statsBox}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {totalStudied}/{totalCards}
                </Text>
                <Text style={styles.statLabel}>Thẻ đã học</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{realProgressPercent}%</Text>
                <Text style={styles.statLabel}>Tiến độ bộ học</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalCards}</Text>
                <Text style={styles.statLabel}>Phiên học này</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.restartButton}
              onPress={handleRestart}
              activeOpacity={0.8}>
              <Text style={styles.restartButtonText}>🔄 Học lại từ đầu</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.finishBackBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}>
              <Text style={styles.finishBackBtnText}>Quay về chi tiết bộ học</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Thẻ hiện tại & kiểm tra thẻ đã học hay chưa
  const currentCard = cards[currentIndex];
  const isCardStudied = studiedCardIds.has(currentCard.card_id);
  const sessionProgressPercent = ((currentIndex + 1) / totalCards) * 100;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Text style={styles.backButtonArrow}>←</Text>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {studySet?.title || 'Flashcards'}
          </Text>
          <View style={styles.progressSubRow}>
            {currentFilter && currentFilter !== 'all' && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {currentFilter === 'unlearned'
                    ? 'Chưa học'
                    : currentFilter === 'review'
                    ? 'Cần ôn'
                    : currentFilter === 'weak'
                    ? 'Hay sai'
                    : 'Đã thuộc'}
                </Text>
              </View>
            )}
            <Text style={styles.counterText}>
              Thẻ {currentIndex + 1} / {totalCards}
            </Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.studiedTotalText}>
              Đã học {totalStudied}/{totalCards} thẻ
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.restartIconBtn}
          onPress={handleRestart}
          activeOpacity={0.7}>
          <Text style={styles.restartIconText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Thanh tiến độ Linear Progress Bar */}
      <View style={styles.progressBarBackground}>
        <View
          style={[styles.progressBarFill, { width: `${sessionProgressPercent}%` }]}
        />
      </View>

      {/* 3. Khu vực thẻ Flashcard chính */}
      <View style={styles.cardArea}>
        <TouchableOpacity
          style={styles.cardTouchWrapper}
          activeOpacity={0.92}
          onPress={handleFlipCard}>
          {/* Mặt trước của thẻ (Term / Pronunciation / Audio) */}
          <Animated.View style={[styles.cardContainer, frontAnimatedStyle]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.headerLeftRow}>
                <View style={styles.termBadge}>
                  <Text style={styles.termBadgeText}>THUẬT NGỮ</Text>
                </View>
                {Boolean(currentCard.audio_url && currentCard.audio_url.trim()) && (
                  <TouchableOpacity
                    style={styles.audioBtn}
                    onPress={() => playAudio(currentCard.audio_url)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.audioBtnText}>🔊 Phát âm</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.cardHeaderRight}>
                {isCardStudied ? (
                  <View style={styles.studiedPill}>
                    <Text style={styles.studiedPillText}>✓ Đã học</Text>
                  </View>
                ) : (
                  <View style={styles.unstudiedPill}>
                    <Text style={styles.unstudiedPillText}>Chưa học</Text>
                  </View>
                )}
                <Text style={styles.cardIndexBadge}>
                  {currentIndex + 1} / {totalCards}
                </Text>
              </View>
            </View>

            <View style={styles.frontContentWrapper}>
              <Text style={styles.termText}>{currentCard.term}</Text>

              {Boolean(currentCard.pronunciation && currentCard.pronunciation.trim()) && (
                <View style={styles.pronunciationBox}>
                  <Text style={styles.pronunciationText}>
                    {currentCard.pronunciation?.trim()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.flipHintText}>
                🔄 Chạm vào thẻ để xem định nghĩa
              </Text>
            </View>
          </Animated.View>

          {/* Mặt sau của thẻ (Definition / Pronunciation / Example / Audio) */}
          <Animated.View
            style={[
              styles.cardContainer,
              styles.cardBackContainer,
              backAnimatedStyle,
            ]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.headerLeftRow}>
                <View style={styles.defBadge}>
                  <Text style={styles.defBadgeText}>ĐỊNH NGHĨA</Text>
                </View>
                {Boolean(currentCard.audio_url && currentCard.audio_url.trim()) && (
                  <TouchableOpacity
                    style={styles.audioBtn}
                    onPress={() => playAudio(currentCard.audio_url)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.audioBtnText}>🔊 Phát âm</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.cardHeaderRight}>
                {isCardStudied ? (
                  <View style={styles.studiedPill}>
                    <Text style={styles.studiedPillText}>✓ Đã học</Text>
                  </View>
                ) : (
                  <View style={styles.unstudiedPill}>
                    <Text style={styles.unstudiedPillText}>Chưa học</Text>
                  </View>
                )}
                <Text style={styles.cardIndexBadge}>
                  {currentIndex + 1} / {totalCards}
                </Text>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.backScrollContent}
              showsVerticalScrollIndicator={false}>
              {/* Hình ảnh minh họa (nếu có) */}
              {!!currentCard.image_url && (
                <Image
                  source={{ uri: currentCard.image_url }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              )}

              {/* Định nghĩa từ vựng */}
              <Text style={styles.definitionText}>
                {currentCard.definition}
              </Text>

              {/* Phát âm trên mặt sau nếu có */}
              {Boolean(currentCard.pronunciation && currentCard.pronunciation.trim()) && (
                <View style={styles.backPronunciationBox}>
                  <Text style={styles.backPronunciationText}>
                    {currentCard.pronunciation?.trim()}
                  </Text>
                </View>
              )}

              {/* Câu ví dụ minh họa nổi bật (nếu có) */}
              {Boolean(currentCard.example && currentCard.example.trim()) && (
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleLabel}>💬 Ví dụ:</Text>
                  <Text style={styles.exampleText}>"{currentCard.example?.trim()}"</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.cardFooter}>
              <Text style={styles.flipHintText}>
                🔄 Chạm vào thẻ để lật lại thuật ngữ
              </Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* 4. Thanh điều khiển Trước / Lật / Tiếp */}
      <View style={styles.controlsBar}>
        {/* Nút Trước */}
        <TouchableOpacity
          style={[
            styles.navButton,
            currentIndex === 0 && styles.navButtonDisabled,
          ]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.navButtonText,
              currentIndex === 0 && styles.navButtonTextDisabled,
            ]}>
            ← Trước
          </Text>
        </TouchableOpacity>

        {/* Nút Lật thẻ nhanh ở giữa */}
        <TouchableOpacity
          style={styles.flipActionBtn}
          onPress={handleFlipCard}
          activeOpacity={0.8}>
          <Text style={styles.flipActionIcon}>🔄</Text>
          <Text style={styles.flipActionText}>
            {isFlipped ? 'Mặt trước' : 'Lật thẻ'}
          </Text>
        </TouchableOpacity>

        {/* Nút Tiếp theo / Hoàn thành */}
        <TouchableOpacity
          style={[
            styles.navButton,
            currentIndex === totalCards - 1
              ? styles.finishNavButton
              : styles.primaryNavButton,
          ]}
          onPress={handleNext}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.navButtonText,
              styles.primaryNavButtonText,
            ]}>
            {currentIndex === totalCards - 1 ? 'Xong 🎉' : 'Tiếp →'}
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 6,
    minWidth: 70,
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
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E3856',
    textAlign: 'center',
  },
  progressSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  filterBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4255FF',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#939BB4',
  },
  dotSeparator: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  studiedTotalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },
  restartIconBtn: {
    minWidth: 70,
    alignItems: 'flex-end',
    paddingVertical: 4,
  },
  restartIconText: {
    fontSize: 18,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#E8ECF4',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4255FF',
  },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cardTouchWrapper: {
    width: CARD_WIDTH,
    height: 440,
    position: 'relative',
  },
  cardContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    position: 'absolute',
    backfaceVisibility: 'hidden',
  },
  cardBackContainer: {
    backgroundColor: '#FFFFFF',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  audioBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4255FF',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  termBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  termBadgeText: {
    color: '#4255FF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  defBadge: {
    backgroundColor: '#E6F9F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  studiedPill: {
    backgroundColor: '#E6F9F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  studiedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  unstudiedPill: {
    backgroundColor: '#F0F2F7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unstudiedPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#939BB4',
  },
  cardIndexBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#939BB4',
  },
  frontContentWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  termText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2E3856',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  pronunciationBox: {
    marginTop: 14,
    backgroundColor: '#F4F6FB',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  pronunciationText: {
    fontSize: 16,
    color: '#4255FF',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  backScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cardImage: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: '#F0F2F7',
  },
  definitionText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2E3856',
    textAlign: 'center',
    lineHeight: 30,
  },
  backPronunciationBox: {
    marginTop: 8,
    backgroundColor: '#F4F6FB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  backPronunciationText: {
    fontSize: 15,
    color: '#4255FF',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  exampleBox: {
    marginTop: 16,
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3.5,
    borderLeftColor: '#4255FF',
    padding: 12,
    borderRadius: 8,
  },
  exampleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4255FF',
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 14,
    color: '#60646C',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  cardFooter: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F7',
  },
  flipHintText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#939BB4',
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8ECF4',
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#F0F2F7',
    minWidth: 90,
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  primaryNavButton: {
    backgroundColor: '#4255FF',
  },
  finishNavButton: {
    backgroundColor: '#15803D',
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E3856',
  },
  navButtonTextDisabled: {
    color: '#939BB4',
  },
  primaryNavButtonText: {
    color: '#FFFFFF',
  },
  flipActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    backgroundColor: '#FFFFFF',
  },
  flipActionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  flipActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E3856',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#60646C',
  },
  stateEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D93025',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 6,
  },
  stateSubtitle: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#4255FF',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#E8ECF4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#2E3856',
    fontSize: 15,
    fontWeight: '600',
  },
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  completedCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  celebrationEmoji: {
    fontSize: 54,
    marginBottom: 12,
  },
  completedTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 8,
  },
  completedSubtitle: {
    fontSize: 15,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  statsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4255FF',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#939BB4',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E8ECF4',
  },
  restartButton: {
    width: '100%',
    backgroundColor: '#4255FF',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  restartButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  finishBackBtn: {
    width: '100%',
    backgroundColor: '#F0F2F7',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  finishBackBtnText: {
    color: '#2E3856',
    fontSize: 15,
    fontWeight: '700',
  },
});
