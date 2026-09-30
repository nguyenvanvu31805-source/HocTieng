import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WeakCard } from '@/types/cardProgress';
import cardProgressService from '@/services/cardProgressService';
import { playAudio } from '@/utils/audioPlayer';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

function checkAnswer(userAnswer: string, targetDefinition: string): boolean {
  const normUser = userAnswer.trim().toLowerCase();
  const normTarget = targetDefinition.trim().toLowerCase();
  if (normUser === normTarget) return true;

  const strip = (str: string) => str.replace(/[.,?!;:'"~]+$/g, '').trim();
  if (strip(normUser) === strip(normTarget)) return true;

  const subDefs = normTarget.split(/[,;/]+/).map((item) => strip(item.trim())).filter(Boolean);
  if (subDefs.includes(strip(normUser))) return true;

  return false;
}

export default function WeakReviewScreen() {
  const router = useRouter();
  const { cardId } = useLocalSearchParams<{ cardId?: string }>();

  const [mode, setMode] = useState<'flashcards' | 'learn'>('flashcards');
  const [cards, setCards] = useState<WeakCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Trạng thái Flashcard
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Trạng thái Learn
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);

  // Thống kê phiên học
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadWeakCards = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
    setTypedAnswer('');
    setIsSubmitted(false);
    setIsAnswerCorrect(null);
    setCorrectCount(0);
    setWrongCount(0);
    flipAnim.setValue(0);

    try {
      const res = await cardProgressService.getWeakCards({ limit: 50, filter: 'all' });
      let list = res?.items || [];

      if (cardId) {
        const specificId = Number(cardId);
        const found = list.find((c) => c.card_id === specificId);
        if (found) {
          list = [found, ...list.filter((c) => c.card_id !== specificId)];
        }
      }

      setCards(list);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || err?.message || 'Không thể tải phiên ôn tập.');
    } finally {
      setLoading(false);
    }
  }, [cardId, flipAnim]);

  useEffect(() => {
    loadWeakCards();
  }, [loadWeakCards]);

  const flipCard = () => {
    if (isFlipped) {
      Animated.spring(flipAnim, {
        toValue: 0,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start(() => setIsFlipped(false));
    } else {
      Animated.spring(flipAnim, {
        toValue: 180,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start(() => setIsFlipped(true));
    }
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  // Xử lý đánh giá trong Flashcard Mode
  const handleFlashcardReview = async (remembered: boolean) => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    if (remembered) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setWrongCount((prev) => prev + 1);
    }

    // Gọi API cập nhật tiến độ
    cardProgressService.reviewCard(currentCard.card_id, remembered).catch(() => {});

    // Chuyển sang thẻ tiếp theo
    if (currentIndex < cards.length - 1) {
      if (isFlipped) {
        flipAnim.setValue(0);
        setIsFlipped(false);
      }
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  // Xử lý nộp câu trả lời trong Learn Mode
  const handleLearnSubmit = () => {
    const currentCard = cards[currentIndex];
    if (!currentCard || !typedAnswer.trim()) return;

    Keyboard.dismiss();
    const correct = checkAnswer(typedAnswer, currentCard.definition);
    setIsAnswerCorrect(correct);
    setIsSubmitted(true);

    if (correct) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setWrongCount((prev) => prev + 1);
    }

    // Gửi tiến độ lên backend
    cardProgressService.reviewCard(currentCard.card_id, correct).catch(() => {});
  };

  const handleLearnNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setTypedAnswer('');
      setIsSubmitted(false);
      setIsAnswerCorrect(null);
    } else {
      setIsCompleted(true);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnArrow}>←</Text>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Ôn từ yếu</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Đang chuẩn bị phiên ôn tập...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnArrow}>←</Text>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Ôn từ yếu</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Lỗi</Text>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={loadWeakCards}>
            <Text style={styles.primaryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnArrow}>←</Text>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Ôn từ yếu</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>Không có từ yếu!</Text>
          <Text style={styles.emptySubtitle}>
            Bạn đã ôn tập hết các từ yếu hiện tại. Hãy tiếp tục duy trì nhé!
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Màn hình Hoàn thành phiên học
  if (isCompleted) {
    const total = cards.length;
    const score = Math.round((correctCount / total) * 100);

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnArrow}>←</Text>
            <Text style={styles.backBtnText}>Đóng</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Kết quả ôn tập</Text>
          <View style={{ width: 70 }} />
        </View>

        <View style={styles.completionContainer}>
          <Text style={styles.completionEmoji}>{score >= 80 ? '🎉' : '👏'}</Text>
          <Text style={styles.completionTitle}>
            {score >= 80 ? 'Rất xuất sắc!' : 'Làm tốt lắm!'}
          </Text>
          <Text style={styles.completionSubtitle}>
            Bạn vừa hoàn thành phiên ôn từ yếu ({total} từ). Tiến độ đã được cập nhật tự động!
          </Text>

          <View style={styles.scoreRow}>
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreNumber, { color: '#15803D' }]}>{correctCount}</Text>
              <Text style={styles.scoreLabel}>Đã nhớ</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreNumber, { color: '#DC2626' }]}>{wrongCount}</Text>
              <Text style={styles.scoreLabel}>Chưa nhớ</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreNumber, { color: '#EA580C' }]}>{score}%</Text>
              <Text style={styles.scoreLabel}>Điểm số</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={loadWeakCards} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>🔄 Ôn tiếp từ yếu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}>
            <Text style={styles.secondaryBtnText}>← Quay về Trung tâm từ yếu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQ = cards[currentIndex];
  const progressPercent = ((currentIndex + 1) / cards.length) * 100;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnArrow}>←</Text>
          <Text style={styles.backBtnText}>Thoát</Text>
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>⚡ Ôn từ yếu</Text>
          <Text style={styles.topBarCounter}>
            {currentIndex + 1} / {cards.length}
          </Text>
        </View>

        {/* Mode Selector Toggle */}
        <View style={styles.modeToggleGroup}>
          <TouchableOpacity
            style={[styles.modeToggleBtn, mode === 'flashcards' && styles.modeToggleActive]}
            onPress={() => {
              setMode('flashcards');
              setIsFlipped(false);
              flipAnim.setValue(0);
            }}>
            <Text style={[styles.modeToggleText, mode === 'flashcards' && styles.modeToggleTextActive]}>
              🎴
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeToggleBtn, mode === 'learn' && styles.modeToggleActive]}
            onPress={() => setMode('learn')}>
            <Text style={[styles.modeToggleText, mode === 'learn' && styles.modeToggleTextActive]}>
              ✍️
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      {/* Content based on selected mode */}
      {mode === 'flashcards' ? (
        <ScrollView contentContainerStyle={styles.flashcardContainer} showsVerticalScrollIndicator={false}>
          {/* Card View with 3D Flip */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={flipCard}
            style={styles.cardScene}>
            {/* Mặt Trước (Thuật ngữ) */}
            <Animated.View
              style={[
                styles.flipCardFace,
                styles.cardFront,
                { transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }] },
                isFlipped && styles.hiddenBackface,
              ]}>
              <View style={styles.cardTopBadgeRow}>
                <Text style={styles.setSourceBadge}>📁 {currentQ.set_title}</Text>
                {Boolean(currentQ.audio_url && currentQ.audio_url.trim()) && (
                  <TouchableOpacity
                    style={styles.audioBtn}
                    onPress={() => playAudio(currentQ.audio_url)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.audioBtnText}>🔊 Phát âm</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.cardCenterBody}>
                <Text style={styles.termText}>{currentQ.term}</Text>
                {Boolean(currentQ.pronunciation && currentQ.pronunciation.trim()) && (
                  <Text style={styles.pronunciationText}>{currentQ.pronunciation?.trim()}</Text>
                )}
              </View>

              <Text style={styles.flipHintText}>Chạm để xem định nghĩa 🔄</Text>
            </Animated.View>

            {/* Mặt Sau (Định nghĩa) */}
            <Animated.View
              style={[
                styles.flipCardFace,
                styles.cardBack,
                { transform: [{ perspective: 1000 }, { rotateY: backInterpolate }] },
                !isFlipped && styles.hiddenBackface,
              ]}>
              <View style={styles.cardTopBadgeRow}>
                <Text style={styles.setSourceBadge}>📁 {currentQ.set_title}</Text>
                {Boolean(currentQ.audio_url && currentQ.audio_url.trim()) && (
                  <TouchableOpacity
                    style={styles.audioBtn}
                    onPress={() => playAudio(currentQ.audio_url)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.audioBtnText}>🔊 Phát âm</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.cardCenterBody}>
                <Text style={styles.definitionText}>{currentQ.definition}</Text>
                {Boolean(currentQ.example && currentQ.example.trim()) && (
                  <View style={styles.exampleBox}>
                    <Text style={styles.exampleLabel}>💬 Ví dụ:</Text>
                    <Text style={styles.exampleText}>"{currentQ.example?.trim()}"</Text>
                  </View>
                )}
              </View>

              <Text style={styles.flipHintText}>Chạm để lật lại 🔄</Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Flashcard Action Buttons */}
          <View style={styles.flashcardActionsRow}>
            <TouchableOpacity
              style={styles.btnWrong}
              onPress={() => handleFlashcardReview(false)}
              activeOpacity={0.8}>
              <Text style={styles.btnActionIcon}>✕</Text>
              <Text style={styles.btnActionText}>Chưa thuộc</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnCorrect}
              onPress={() => handleFlashcardReview(true)}
              activeOpacity={0.8}>
              <Text style={styles.btnActionIcon}>✓</Text>
              <Text style={styles.btnActionText}>Đã nhớ</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.learnContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.learnCard}>
              <View style={styles.cardTopBadgeRow}>
                <Text style={styles.setSourceBadge}>📁 {currentQ.set_title}</Text>
                {Boolean(currentQ.audio_url && currentQ.audio_url.trim()) && (
                  <TouchableOpacity
                    style={styles.audioBtn}
                    onPress={() => playAudio(currentQ.audio_url)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.audioBtnText}>🔊 Phát âm</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.learnPrompt}>Nghĩa đúng của từ này là gì?</Text>
              <Text style={styles.learnTerm}>{currentQ.term}</Text>

              {Boolean(currentQ.pronunciation && currentQ.pronunciation.trim()) && (
                <Text style={styles.learnPronunciation}>{currentQ.pronunciation?.trim()}</Text>
              )}

              {/* Input câu trả lời */}
              <TextInput
                style={[
                  styles.learnInput,
                  isSubmitted && (isAnswerCorrect ? styles.inputCorrect : styles.inputWrong),
                ]}
                placeholder="Nhập nghĩa của từ..."
                placeholderTextColor="#94A3B8"
                value={typedAnswer}
                onChangeText={setTypedAnswer}
                editable={!isSubmitted}
                autoCapitalize="none"
              />

              {/* Feedback khi đã nộp */}
              {isSubmitted && (
                <View
                  style={[
                    styles.feedbackBox,
                    isAnswerCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
                  ]}>
                  <Text
                    style={[
                      styles.feedbackTitle,
                      isAnswerCorrect ? styles.textCorrect : styles.textWrong,
                    ]}>
                    {isAnswerCorrect ? '✓ Chính xác!' : '✕ Chưa chính xác!'}
                  </Text>
                  {!isAnswerCorrect && (
                    <Text style={styles.feedbackCorrectAns}>
                      Đáp án đúng: <Text style={{ fontWeight: '700' }}>{currentQ.definition}</Text>
                    </Text>
                  )}
                  {Boolean(currentQ.example && currentQ.example.trim()) && (
                    <Text style={styles.feedbackExample}>
                      💬 Ví dụ: "{currentQ.example?.trim()}"
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Learn Action Button */}
            {!isSubmitted ? (
              <TouchableOpacity
                style={[styles.primaryBtn, !typedAnswer.trim() && { opacity: 0.5 }]}
                onPress={handleLearnSubmit}
                disabled={!typedAnswer.trim()}
                activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Kiểm tra câu trả lời</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleLearnNext}
                activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>
                  {currentIndex < cards.length - 1 ? 'Câu tiếp theo →' : 'Xem kết quả 🎉'}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
    paddingVertical: 10,
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
  topBarCenter: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  topBarCounter: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  modeToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    minWidth: 70,
    justifyContent: 'flex-end',
  },
  modeToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeToggleActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modeToggleText: {
    fontSize: 14,
  },
  modeToggleTextActive: {
    fontWeight: '700',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#E2E8F0',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#EA580C',
  },
  flashcardContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  cardScene: {
    width: CARD_WIDTH,
    height: 380,
    marginBottom: 28,
  },
  flipCardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    backgroundColor: '#FFFFFF',
  },
  cardBack: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FED7AA',
  },
  hiddenBackface: {
    opacity: 0,
  },
  cardTopBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  setSourceBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: '65%',
  },
  cardCenterBody: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  termText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  pronunciationText: {
    fontSize: 16,
    color: '#4255FF',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  definitionText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 30,
  },
  exampleBox: {
    marginTop: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#EA580C',
    width: '100%',
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
  flipHintText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  flashcardActionsRow: {
    flexDirection: 'row',
    width: CARD_WIDTH,
    gap: 16,
  },
  btnWrong: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  btnCorrect: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  btnActionIcon: {
    fontSize: 16,
    fontWeight: '800',
  },
  btnActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  learnContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  learnCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  learnPrompt: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  learnTerm: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  learnPronunciation: {
    fontSize: 14,
    color: '#4255FF',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  learnInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 12,
  },
  inputCorrect: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  inputWrong: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  feedbackBox: {
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  feedbackCorrect: {
    backgroundColor: '#DCFCE7',
  },
  feedbackWrong: {
    backgroundColor: '#FEE2E2',
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  feedbackCorrectAns: {
    fontSize: 13,
    color: '#991B1B',
    marginBottom: 4,
  },
  feedbackExample: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
  },
  textCorrect: {
    color: '#15803D',
  },
  textWrong: {
    color: '#DC2626',
  },
  primaryBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  completionEmoji: {
    fontSize: 54,
    marginBottom: 16,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  completionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 28,
    width: '100%',
    justifyContent: 'space-around',
  },
  scoreBox: {
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  scoreDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
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
  emptyIcon: {
    fontSize: 50,
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
    lineHeight: 20,
    marginBottom: 20,
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
});
