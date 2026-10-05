import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Card } from '@/types/card';
import { StudySet } from '@/types/studySet';
import studySetService from '@/services/studySetService';
import cardService from '@/services/cardService';
import cardProgressService from '@/services/cardProgressService';
import assignmentService from '@/services/assignmentService';
import { playAudio } from '@/utils/audioPlayer';
import useStudySession from '@/hooks/useStudySession';

// Hàm xáo trộn mảng ngẫu nhiên theo thuật toán Fisher-Yates
function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Chuẩn hóa văn bản và kiểm tra câu trả lời
function checkAnswer(userAnswer: string, targetDefinition: string): boolean {
  const normUser = userAnswer.trim().toLowerCase();
  const normTarget = targetDefinition.trim().toLowerCase();

  // 1. So khớp tuyệt đối sau khi trim và lowercase (theo yêu cầu tối thiểu)
  if (normUser === normTarget) return true;

  // 2. Loại bỏ dấu câu ở cuối (ví dụ dấu chấm câu ".")
  const stripTrailing = (str: string) => str.replace(/[.,?!]+$/g, '').trim();
  if (stripTrailing(normUser) === stripTrailing(normTarget)) return true;

  // 3. Nếu định nghĩa gốc có nhiều nghĩa ngăn cách bởi dấu phẩy, chấm phẩy hoặc gạch chéo
  const subDefinitions = normTarget
    .split(/[,;/]+/)
    .map((item) => stripTrailing(item.trim()))
    .filter(Boolean);

  if (subDefinitions.includes(stripTrailing(normUser))) return true;

  return false;
}

export default function LearnModeScreen() {
  const router = useRouter();
  const { id, filter: initialFilter, assignmentId, classId } = useLocalSearchParams<{
    id: string;
    filter?: string;
    assignmentId?: string;
    classId?: string;
  }>();
  const [currentFilter, setCurrentFilter] = useState<string>(initialFilter || 'all');

  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [shuffledCards, setShuffledCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [hasRecorded, setHasRecorded] = useState(false);

  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [assignmentSubmitted, setAssignmentSubmitted] = useState(false);
  const assignmentSubmittedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Tích hợp ghi nhận study session và streak
  const { recordCardStudied, completeSession } = useStudySession({
    setId: id,
    mode: 'LEARN',
  });

  // Tải dữ liệu Study Set và Cards
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMessage('');

    try {
      const [setRes, cardsRes] = await Promise.all([
        studySetService.getStudySet(id),
        cardService.getCards(id, currentFilter !== 'all' ? currentFilter : undefined),
      ]);

      if (setRes.success && setRes.data) {
        setStudySet(setRes.data);
      } else {
        throw new Error(setRes.message || 'Không tìm thấy bộ học.');
      }

      if (cardsRes.success && Array.isArray(cardsRes.data)) {
        setCards(cardsRes.data);
        if (cardsRes.data.length > 0) {
          setShuffledCards(shuffleArray(cardsRes.data));
        } else {
          setShuffledCards([]);
        }
      } else {
        setCards([]);
        setShuffledCards([]);
      }
    } catch (error: any) {
      const msg =
        error?.status === 404
          ? 'Bộ học không tồn tại hoặc đã bị xóa.'
          : error?.data?.message ||
            error?.message ||
            'Không thể tải dữ liệu bài học. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [id, currentFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Xử lý nộp câu trả lời và kiểm tra
  const handleCheckAnswer = () => {
    const trimmedAnswer = userAnswer.trim();
    if (!trimmedAnswer) {
      Alert.alert(
        'Chưa nhập câu trả lời',
        'Vui lòng nhập định nghĩa hoặc giải nghĩa trước khi kiểm tra.',
      );
      return;
    }

    Keyboard.dismiss();
    const currentCard = shuffledCards[currentIndex];
    if (!currentCard) return;

    const correct = checkAnswer(trimmedAnswer, currentCard.definition);

    setIsSubmitted(true);
    setIsCorrect(correct);

    if (correct) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setWrongCount((prev) => prev + 1);
    }

    recordCardStudied();

    // Ghi nhận tiến độ học đúng 1 lần cho mỗi câu
    if (!hasRecorded) {
      setHasRecorded(true);
      cardProgressService.reviewCard(currentCard.card_id, correct);
    }
  };

  // Người dùng chọn "Không biết / Bỏ qua" để xem đáp án
  const handleSkipQuestion = () => {
    Keyboard.dismiss();
    const currentCard = shuffledCards[currentIndex];
    if (!currentCard) return;

    setIsSubmitted(true);
    setIsCorrect(false);
    setWrongCount((prev) => prev + 1);
    recordCardStudied();

    if (!hasRecorded) {
      setHasRecorded(true);
      cardProgressService.reviewCard(currentCard.card_id, false);
    }
  };

  // Chuyển sang câu tiếp theo hoặc hoàn thành
  const handleNextQuestion = async () => {
    if (currentIndex + 1 < shuffledCards.length) {
      setCurrentIndex((prev) => prev + 1);
      setUserAnswer('');
      setIsSubmitted(false);
      setIsCorrect(null);
      setHasRecorded(false);
    } else {
      setIsCompleted(true);
      const totalLen = shuffledCards.length;
      const score = totalLen > 0 ? Math.round((correctCount / totalLen) * 100) : 0;
      const sessionId = await completeSession({ score, cardsStudied: totalLen });

      if (assignmentId && !assignmentSubmittedRef.current) {
        assignmentSubmittedRef.current = true;
        try {
          await assignmentService.submitAssignment(assignmentId, {
            session_id: sessionId || undefined,
          });
          setAssignmentSubmitted(true);
        } catch (subErr) {
          console.warn('Lỗi khi nộp bài tập:', subErr);
        }
      }
    }
  };

  // Học lại từ đầu
  const handleRestart = () => {
    setShuffledCards(shuffleArray(cards));
    setCurrentIndex(0);
    setUserAnswer('');
    setIsSubmitted(false);
    setIsCorrect(null);
    setCorrectCount(0);
    setWrongCount(0);
    setHasRecorded(false);
    setIsCompleted(false);
  };

  // --- Render trạng thái Loading / Lỗi / Trống ---
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4255FF" />
          <Text style={styles.loadingText}>Đang chuẩn bị bài học...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.topBarTitle}>Học (Learn Mode)</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>Đã xảy ra lỗi</Text>
          <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (cards.length === 0 || shuffledCards.length === 0) {
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
        : 'Bộ học này chưa có thẻ từ vựng nào để học. Hãy thêm thẻ trước khi bắt đầu.';

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
          <Text style={styles.topBarTitle}>Học (Learn Mode)</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.stateIcon}>{isFiltered ? '🎯' : '📝'}</Text>
          <Text style={styles.stateTitle}>
            {isFiltered ? 'Không có từ trong phạm vi này' : 'Chưa có thẻ từ vựng'}
          </Text>
          <Text style={styles.stateSubtitle}>{filterMessage}</Text>
          <View style={styles.emptyButtonsRow}>
            {isFiltered && (
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={() => setCurrentFilter('all')}>
                <Text style={styles.primaryActionText}>📚 Học tất cả</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={isFiltered ? styles.secondaryActionButton : styles.primaryActionButton}
              onPress={() => router.back()}>
              <Text
                style={
                  isFiltered
                    ? styles.secondaryActionText
                    : styles.primaryActionText
                }>
                Quay lại bộ học
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // --- Render Màn hình Kết quả sau khi học hết thẻ ---
  if (isCompleted) {
    const total = shuffledCards.length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    let gradeMessage = 'Cần cố gắng thêm! Hãy ôn lại các từ chưa nhớ nhé.';
    let gradeEmoji = '💪';
    if (accuracy >= 90) {
      gradeMessage = 'Xuất sắc! Bạn đã ghi nhớ gần như toàn bộ từ vựng.';
      gradeEmoji = '🏆';
    } else if (accuracy >= 70) {
      gradeMessage = 'Rất tốt! Bạn đã nắm được đa số từ vựng.';
      gradeEmoji = '⭐';
    } else if (accuracy >= 50) {
      gradeMessage = 'Khá ổn! Luyện tập thêm một lần nữa để đạt điểm cao hơn.';
      gradeEmoji = '👍';
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <Text style={styles.backButtonArrow}>←</Text>
            <Text style={styles.backButtonText}>Bộ học</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Kết quả học tập</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.resultContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.resultHeaderCard}>
            <Text style={styles.resultEmoji}>{gradeEmoji}</Text>
            <Text style={styles.resultMainTitle}>Hoàn thành!</Text>
            <Text style={styles.resultSubtitle}>{studySet?.title}</Text>
            <Text style={styles.resultGradeMessage}>{gradeMessage}</Text>
          </View>

          {/* Banner nộp bài tập */}
          {(assignmentSubmitted || assignmentId) && (
            <View style={styles.assignmentSuccessBanner}>
              <Text style={styles.assignmentSuccessIcon}>🎉</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.assignmentSuccessTitle}>Đã hoàn thành bài tập!</Text>
                <Text style={styles.assignmentSuccessSub}>
                  Độ chính xác: {accuracy}% – Kết quả đã được ghi nhận vào lớp học.
                </Text>
              </View>
            </View>
          )}

          {/* Vòng tròn phần trăm chính xác */}
          <View style={styles.accuracyCard}>
            <Text style={styles.accuracyLabel}>ĐỘ CHÍNH XÁC</Text>
            <Text
              style={[
                styles.accuracyValue,
                accuracy >= 70 ? styles.textSuccess : styles.textWarning,
              ]}>
              {accuracy}%
            </Text>
          </View>

          {/* Thống kê chi tiết số câu đúng / sai */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, styles.statBoxSuccess]}>
              <Text style={styles.statIcon}>✓</Text>
              <Text style={styles.statNumber}>{correctCount}</Text>
              <Text style={styles.statLabel}>Đúng</Text>
            </View>

            <View style={[styles.statBox, styles.statBoxDanger]}>
              <Text style={styles.statIcon}>✗</Text>
              <Text style={styles.statNumber}>{wrongCount}</Text>
              <Text style={styles.statLabel}>Chưa đúng</Text>
            </View>

            <View style={[styles.statBox, styles.statBoxNeutral]}>
              <Text style={styles.statIcon}>📚</Text>
              <Text style={styles.statNumber}>{total}</Text>
              <Text style={styles.statLabel}>Tổng số thẻ</Text>
            </View>
          </View>

          {/* Hàng nút hành động */}
          <View style={styles.resultButtonsContainer}>
            {classId && (
              <TouchableOpacity
                style={styles.backToClassBtn}
                onPress={() => router.replace(`/class/${classId}` as any)}
                activeOpacity={0.8}>
                <Text style={styles.backToClassBtnText}>🏫 Quay lại lớp học</Text>
              </TouchableOpacity>
            )}
            {assignmentId && (
              <TouchableOpacity
                style={styles.backToAssignmentBtn}
                onPress={() => router.replace(`/assignment/${assignmentId}` as any)}
                activeOpacity={0.8}>
                <Text style={styles.backToAssignmentBtnText}>📋 Xem chi tiết bài tập</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.restartButton}
              onPress={handleRestart}
              activeOpacity={0.8}>
              <Text style={styles.restartButtonIcon}>🔄</Text>
              <Text style={styles.restartButtonText}>Học lại</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.finishBackButton}
              onPress={() => router.back()}
              activeOpacity={0.8}>
              <Text style={styles.finishBackButtonText}>Quay lại bộ học</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Render Màn hình Câu hỏi đang học ---
  const currentCard = shuffledCards[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / shuffledCards.length) * 100);
  const isLastQuestion = currentIndex + 1 === shuffledCards.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Bar Navigation */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Alert.alert(
              'Thoát bài học?',
              'Tiến độ của các câu đã hoàn thành đã được ghi nhận. Bạn có chắc muốn dừng bài học không?',
              [
                { text: 'Tiếp tục học', style: 'cancel' },
                { text: 'Thoát', style: 'destructive', onPress: () => router.back() },
              ],
            );
          }}
          activeOpacity={0.7}>
          <Text style={styles.backButtonArrow}>✕</Text>
          <Text style={styles.backButtonText}>Thoát</Text>
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {studySet?.title || 'Học từ vựng'}
          </Text>
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
        </View>

        <View style={styles.questionCounterBadge}>
          <Text style={styles.questionCounterText}>
            {currentIndex + 1} / {shuffledCards.length}
          </Text>
        </View>
      </View>

      {/* Thanh tiến độ */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Thẻ Thuật ngữ câu hỏi */}
          <View style={styles.termCard}>
            <View style={styles.termHeaderRow}>
              <View style={styles.termBadgeRow}>
                <Text style={styles.termTag}>THUẬT NGỮ</Text>
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
              <Text style={styles.cardIndexText}>Thẻ #{currentIndex + 1}</Text>
            </View>

            <Text style={styles.termText}>{currentCard.term}</Text>

            {Boolean(currentCard.pronunciation && currentCard.pronunciation.trim()) && (
              <View style={styles.pronunciationBox}>
                <Text style={styles.pronunciationText}>
                  {currentCard.pronunciation?.trim()}
                </Text>
              </View>
            )}
          </View>

          {/* Phần nhập câu trả lời của người dùng */}
          <View style={styles.answerSection}>
            <Text style={styles.answerSectionLabel}>
              ĐỊNH NGHĨA / GIẢI NGHĨA TIẾNG VIỆT
            </Text>

            <TextInput
              style={[
                styles.answerInput,
                isSubmitted && (isCorrect ? styles.inputSuccess : styles.inputDanger),
              ]}
              placeholder="Nhập định nghĩa của thuật ngữ này..."
              placeholderTextColor="#939BB4"
              value={userAnswer}
              onChangeText={setUserAnswer}
              editable={!isSubmitted}
              multiline
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (!isSubmitted) handleCheckAnswer();
              }}
            />
          </View>

          {/* Phản hồi kết quả sau khi bấm "Kiểm tra" */}
          {isSubmitted && (
            <View
              style={[
                styles.feedbackCard,
                isCorrect ? styles.feedbackCardSuccess : styles.feedbackCardDanger,
              ]}>
              <View style={styles.feedbackHeaderRow}>
                <View style={styles.feedbackTitleRow}>
                  <Text style={styles.feedbackEmoji}>{isCorrect ? '✓' : '✗'}</Text>
                  <Text
                    style={[
                      styles.feedbackTitle,
                      isCorrect ? styles.textSuccess : styles.textDanger,
                    ]}>
                    {isCorrect ? 'Chính xác! Tuyệt vời!' : 'Chưa chính xác'}
                  </Text>
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

              {!isCorrect && (
                <View style={styles.correctionBox}>
                  <View style={styles.correctionRow}>
                    <Text style={styles.correctionLabel}>Câu trả lời của bạn:</Text>
                    <Text style={styles.userWrongAnswer}>
                      {userAnswer.trim() || '(Không có câu trả lời)'}
                    </Text>
                  </View>

                  <View style={styles.correctionRow}>
                    <Text style={styles.correctionLabel}>Đáp án đúng:</Text>
                    <Text style={styles.correctDefinition}>
                      {currentCard.definition}
                    </Text>
                  </View>
                </View>
              )}

              {isCorrect && (
                <Text style={styles.correctNoteText}>
                  Định nghĩa: {currentCard.definition}
                </Text>
              )}

              {/* Phiên âm sau khi kiểm tra câu trả lời */}
              {Boolean(currentCard.pronunciation && currentCard.pronunciation.trim()) && (
                <View style={styles.feedbackPronunciationBox}>
                  <Text style={styles.feedbackPronunciationLabel}>Phiên âm:</Text>
                  <Text style={styles.feedbackPronunciationText}>
                    {currentCard.pronunciation?.trim()}
                  </Text>
                </View>
              )}

              {/* Ví dụ ngữ cảnh nổi bật sau khi nộp bài */}
              {Boolean(currentCard.example && currentCard.example.trim()) && (
                <View style={styles.feedbackExampleBox}>
                  <Text style={styles.feedbackExampleLabel}>💬 Ví dụ:</Text>
                  <Text style={styles.feedbackExampleText}>
                    "{currentCard.example?.trim()}"
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Khoảng trống đệm cuối trang */}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Thanh nút hành động ghim dưới cùng */}
        <View style={styles.bottomActionBar}>
          {!isSubmitted ? (
            <View style={styles.actionButtonGroup}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkipQuestion}
                activeOpacity={0.7}>
                <Text style={styles.skipButtonText}>Không biết?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkButton}
                onPress={handleCheckAnswer}
                activeOpacity={0.8}>
                <Text style={styles.checkButtonText}>Kiểm tra</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.nextButton,
                isCorrect ? styles.nextButtonSuccess : styles.nextButtonPrimary,
              ]}
              onPress={handleNextQuestion}
              activeOpacity={0.8}>
              <Text style={styles.nextButtonText}>
                {isLastQuestion ? 'Xem kết quả 🎉' : 'Tiếp theo →'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  keyboardContainer: {
    flex: 1,
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
    fontSize: 18,
    color: '#60646C',
    fontWeight: '700',
    marginRight: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: '#60646C',
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E3856',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  questionCounterBadge: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  questionCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4255FF',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#E8ECF4',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4255FF',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 24,
  },
  termCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  termHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  termTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4255FF',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  termBadgeRow: {
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
  pronunciationBox: {
    marginTop: 4,
    backgroundColor: '#F4F6FB',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    marginBottom: 8,
  },
  cardIndexText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#939BB4',
  },
  termText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2E3856',
    lineHeight: 34,
    marginBottom: 6,
  },
  pronunciationText: {
    fontSize: 16,
    color: '#6366F1',
    fontStyle: 'italic',
    fontWeight: '500',
    marginBottom: 12,
  },
  exampleBox: {
    backgroundColor: '#F8F9FD',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4255FF',
    marginTop: 6,
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#939BB4',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  exampleText: {
    fontSize: 13,
    color: '#495057',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  answerSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginBottom: 16,
  },
  answerSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60646C',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  answerInput: {
    backgroundColor: '#F8F9FD',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2E3856',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputSuccess: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  inputDanger: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  feedbackCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  feedbackCardSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  feedbackCardDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feedbackTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackEmoji: {
    fontSize: 20,
    fontWeight: '800',
    marginRight: 8,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  textSuccess: {
    color: '#059669',
  },
  textDanger: {
    color: '#DC2626',
  },
  textWarning: {
    color: '#D97706',
  },
  correctionBox: {
    marginTop: 6,
    gap: 8,
  },
  correctionRow: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
  },
  correctionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60646C',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  userWrongAnswer: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    textDecorationLine: 'line-through',
  },
  correctDefinition: {
    fontSize: 15,
    color: '#059669',
    fontWeight: '700',
  },
  correctNoteText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },
  feedbackPronunciationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  feedbackPronunciationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60646C',
    textTransform: 'uppercase',
  },
  feedbackPronunciationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4255FF',
    fontStyle: 'italic',
  },
  feedbackExampleBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#4255FF',
    marginTop: 10,
  },
  feedbackExampleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4255FF',
    marginBottom: 2,
  },
  feedbackExampleText: {
    fontSize: 13,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  bottomActionBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8ECF4',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F0F2F7',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#60646C',
  },
  checkButton: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#4255FF',
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  checkButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  nextButtonPrimary: {
    backgroundColor: '#4255FF',
  },
  nextButtonSuccess: {
    backgroundColor: '#10B981',
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultContainer: {
    padding: 20,
    alignItems: 'center',
  },
  resultHeaderCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginBottom: 16,
  },
  resultEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  resultMainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#60646C',
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  resultGradeMessage: {
    fontSize: 14,
    color: '#4255FF',
    fontWeight: '600',
    textAlign: 'center',
  },
  accuracyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginBottom: 16,
  },
  accuracyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#939BB4',
    letterSpacing: 1,
    marginBottom: 4,
  },
  accuracyValue: {
    fontSize: 44,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  statBoxSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statBoxDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statBoxNeutral: {
    backgroundColor: '#F8F9FD',
    borderColor: '#E8ECF4',
  },
  statIcon: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#60646C',
  },
  resultButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4255FF',
    paddingVertical: 14,
    borderRadius: 12,
  },
  restartButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  restartButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  finishBackButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    paddingVertical: 14,
    borderRadius: 12,
  },
  finishBackButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#60646C',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#60646C',
  },
  stateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 6,
  },
  stateSubtitle: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4255FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryActionButton: {
    backgroundColor: '#4255FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4255FF',
  },
  emptyButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  secondaryActionButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#4255FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  secondaryActionText: {
    color: '#4255FF',
    fontSize: 14,
    fontWeight: '700',
  },
  assignmentSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  assignmentSuccessIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  assignmentSuccessTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 2,
  },
  assignmentSuccessSub: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
  },
  backToClassBtn: {
    backgroundColor: '#4255FF',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  backToClassBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  backToAssignmentBtn: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  backToAssignmentBtnText: {
    color: '#4255FF',
    fontSize: 14,
    fontWeight: '700',
  },
});
