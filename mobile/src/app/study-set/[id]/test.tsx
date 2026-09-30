import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/types/card';
import { StudySet } from '@/types/studySet';
import {
  QuestionOption,
  QuizQuestion,
  QuizSummary,
} from '@/types/testResult';
import api from '@/services/api';
import testResultService from '@/services/testResultService';
import { playAudio } from '@/utils/audioPlayer';

const { width } = Dimensions.get('window');

// Hàm xáo trộn mảng ngẫu nhiên (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Xây dựng danh sách câu hỏi trắc nghiệm A, B, C, D từ danh sách thẻ
// Cho phép truyền allCards để lựa chọn đáp án nhiễu (distractors) ngay cả khi chỉ làm lại một số câu
function buildQuizQuestions(cards: Card[], allCards: Card[] = cards): QuizQuestion[] {
  const labels = ['A', 'B', 'C', 'D'];

  return cards.map((card) => {
    // Thu thập các định nghĩa của các thẻ khác để làm đáp án nhiễu (distractors)
    const otherDefinitions = Array.from(
      new Set(
        allCards
          .filter((c) => c.card_id !== card.card_id && !!c.definition?.trim())
          .map((c) => c.definition.trim()),
      ),
    );

    // Lấy tối đa 3 đáp án nhiễu đã xáo trộn
    const distractors = shuffleArray(otherDefinitions).slice(0, 3);

    // Gộp đáp án đúng và đáp án nhiễu, sau đó xáo trộn vị trí
    const combinedChoices = shuffleArray([
      card.definition.trim(),
      ...distractors,
    ]);

    const options: QuestionOption[] = combinedChoices.map((text, idx) => ({
      label: labels[idx] || String.fromCharCode(65 + idx),
      text,
    }));

    return {
      card_id: card.card_id,
      term: card.term,
      pronunciation: card.pronunciation,
      example: card.example,
      audio_url: card.audio_url,
      correctDefinition: card.definition.trim(),
      options,
    };
  });
}

export default function TestScreen() {
  const router = useRouter();
  const { id, retryResultId } = useLocalSearchParams<{ id: string; retryResultId?: string }>();
  const { isAuthenticated } = useAuth();

  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [index: number]: string }>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [quizSummary, setQuizSummary] = useState<QuizSummary | null>(null);
  const [isRetrySession, setIsRetrySession] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  // Tải dữ liệu bộ học và các thẻ
  const fetchTestData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMessage('');
    setSelectedAnswers({});
    setCurrentIndex(0);
    setQuizSummary(null);

    try {
      const [setRes, cardsRes] = await Promise.all([
        api.get<StudySet>(`/study-sets/${id}`),
        api.get<Card[]>(`/study-sets/${id}/cards`),
      ]);

      if (setRes.success && setRes.data) {
        setStudySet(setRes.data);
      } else {
        throw new Error(setRes.message || 'Không tìm thấy bộ học.');
      }

      const fullCards = cardsRes.success && Array.isArray(cardsRes.data) ? cardsRes.data : [];
      setAllCards(fullCards);

      if (fullCards.length === 0) {
        setCards([]);
        setQuestions([]);
        setIsRetrySession(false);
        return;
      }

      // Nếu có retryResultId, thử lấy danh sách câu hỏi đã trả lời sai ở lần thi trước
      if (retryResultId) {
        try {
          const prevResult = await testResultService.getTestResult(retryResultId);
          const incorrectIds = prevResult?.incorrect_card_ids || [];
          const wrongCards = fullCards.filter((c) => incorrectIds.includes(c.card_id));

          if (wrongCards.length > 0) {
            setCards(wrongCards);
            setQuestions(buildQuizQuestions(wrongCards, fullCards));
            setIsRetrySession(true);
          } else {
            Alert.alert(
              'Thông báo',
              'Không có câu hỏi trả lời sai để làm lại. Bắt đầu bài kiểm tra đầy đủ.',
            );
            setCards(fullCards);
            setQuestions(buildQuizQuestions(fullCards, fullCards));
            setIsRetrySession(false);
          }
        } catch (retryErr) {
          console.warn('Lỗi khi tải câu sai để làm lại:', retryErr);
          setCards(fullCards);
          setQuestions(buildQuizQuestions(fullCards, fullCards));
          setIsRetrySession(false);
        }
      } else {
        setCards(fullCards);
        setQuestions(buildQuizQuestions(fullCards, fullCards));
        setIsRetrySession(false);
      }
    } catch (err: any) {
      const msg =
        err?.status === 404
          ? 'Không tìm thấy bộ học hoặc bộ học đã bị xóa.'
          : err?.data?.message ||
            err?.message ||
            'Không thể tải bài luyện tập. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [id, retryResultId]);

  useEffect(() => {
    fetchTestData();
  }, [fetchTestData]);

  // Đếm số câu đã trả lời
  const answeredCount = useMemo(() => {
    return Object.keys(selectedAnswers).filter((k) => !!selectedAnswers[Number(k)]?.trim()).length;
  }, [selectedAnswers]);

  const unansweredCount = questions.length - answeredCount;

  // Xử lý chọn đáp án cho câu hỏi hiện tại
  const handleSelectOption = (optionText: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionText,
    }));
  };

  // Nộp bài và lưu kết quả chi tiết
  const executeSubmit = async () => {
    if (submitting || !questions.length) return;
    setSubmitting(true);

    try {
      // 1. Chuẩn bị payload chi tiết cho backend
      const detailsInput = questions.map((q, idx) => ({
        card_id: q.card_id,
        question_order: idx + 1,
        user_answer: selectedAnswers[idx] || '',
      }));

      const totalQuestions = questions.length;

      // 2. Gửi kết quả lên backend (Backend tự động chấm điểm, lưu snapshot và cập nhật card_progress)
      let savedResult = null;
      try {
        savedResult = await testResultService.submitTestResult({
          set_id: Number(id),
          total_questions: totalQuestions,
          details: detailsInput,
        });
      } catch (submitErr) {
        console.warn('Không thể lưu kết quả bài kiểm tra lên server:', submitErr);
      }

      // 3. Hiển thị màn hình kết quả từ dữ liệu backend (hoặc fallback tính toán nếu cần)
      if (savedResult?.details && savedResult.details.length > 0) {
        const resultDetails = savedResult.details.map((d) => ({
          questionNumber: d.question_order,
          card_id: d.card_id,
          term: d.term,
          pronunciation: d.pronunciation,
          example: d.example,
          audio_url: d.audio_url,
          userAnswer: d.user_answer || '',
          correctAnswer: d.correct_answer,
          isCorrect: Boolean(d.is_correct),
        }));

        const scoreVal =
          typeof savedResult.score === 'string'
            ? parseFloat(savedResult.score)
            : savedResult.score;

        setQuizSummary({
          totalQuestions: savedResult.total_questions,
          correctAnswers: savedResult.correct_answers,
          wrongAnswers: savedResult.total_questions - savedResult.correct_answers,
          score: scoreVal,
          savedResult,
          details: resultDetails,
        });
      } else {
        // Fallback offline / local grading
        const fallbackDetails = questions.map((q, idx) => {
          const userChoice = selectedAnswers[idx] || '';
          const isCorrect =
            userChoice.trim().toLowerCase() === q.correctDefinition.trim().toLowerCase();
          return {
            questionNumber: idx + 1,
            card_id: q.card_id,
            term: q.term,
            pronunciation: q.pronunciation,
            example: q.example,
            audio_url: q.audio_url,
            userAnswer: userChoice,
            correctAnswer: q.correctDefinition,
            isCorrect,
          };
        });

        const correctAnswers = fallbackDetails.filter((d) => d.isCorrect).length;
        const wrongAnswers = totalQuestions - correctAnswers;
        const score = Number(((correctAnswers / totalQuestions) * 100).toFixed(2));

        setQuizSummary({
          totalQuestions,
          correctAnswers,
          wrongAnswers,
          score,
          savedResult: null,
          details: fallbackDetails,
        });
      }
    } catch (err: any) {
      Alert.alert(
        'Lỗi nộp bài',
        err?.data?.message || err?.message || 'Có lỗi xảy ra khi nộp bài kiểm tra.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Người dùng bấm nút Nộp bài
  const handleSubmitPrompt = () => {
    if (unansweredCount > 0) {
      Alert.alert(
        'Chưa hoàn thành bài làm',
        `Bạn còn ${unansweredCount} câu chưa trả lời. Bạn có chắc chắn muốn nộp bài không?`,
        [
          { text: 'Làm tiếp', style: 'cancel' },
          { text: 'Nộp bài ngay', style: 'destructive', onPress: executeSubmit },
        ],
      );
    } else {
      executeSubmit();
    }
  };

  // Làm lại toàn bộ bài kiểm tra (tất cả các câu trong bộ học)
  const handleRestartAll = () => {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setQuizSummary(null);
    setIsRetrySession(false);
    if (allCards.length > 0) {
      setCards(allCards);
      setQuestions(buildQuizQuestions(allCards, allCards));
    } else if (cards.length > 0) {
      setQuestions(buildQuizQuestions(cards, cards));
    }
    router.setParams({ retryResultId: undefined });
  };

  // Làm lại các câu sai của bài kiểm tra vừa làm
  const handleRetryIncorrect = () => {
    if (!quizSummary) return;

    let wrongCardIds: number[] = [];
    if (quizSummary.savedResult?.incorrect_card_ids) {
      wrongCardIds = quizSummary.savedResult.incorrect_card_ids;
    } else {
      wrongCardIds = quizSummary.details
        .filter((d) => !d.isCorrect && d.card_id)
        .map((d) => d.card_id as number);
    }

    if (wrongCardIds.length === 0) {
      Alert.alert('Chúc mừng!', 'Bạn đã trả lời đúng tất cả các câu hỏi.');
      return;
    }

    const availableCards = allCards.length > 0 ? allCards : cards;
    const wrongCards = availableCards.filter((c) => wrongCardIds.includes(c.card_id));

    if (wrongCards.length === 0) {
      Alert.alert('Thông báo', 'Không tìm thấy thẻ câu sai tương ứng.');
      return;
    }

    setSelectedAnswers({});
    setCurrentIndex(0);
    setQuizSummary(null);
    setIsRetrySession(true);
    setCards(wrongCards);
    setQuestions(buildQuizQuestions(wrongCards, availableCards));

    if (quizSummary.savedResult?.result_id) {
      router.setParams({ retryResultId: String(quizSummary.savedResult.result_id) });
    }
  };

  // Xác nhận khi người dùng bấm quay lại giữa chừng
  const handleBackPress = () => {
    if (!quizSummary && answeredCount > 0) {
      Alert.alert(
        'Rời bài luyện tập?',
        'Bài làm hiện tại của bạn sẽ không được lưu nếu bạn thoát ra.',
        [
          { text: 'Ở lại làm tiếp', style: 'cancel' },
          { text: 'Rời đi', style: 'destructive', onPress: () => router.back() },
        ],
      );
    } else {
      router.back();
    }
  };

  // Render trạng thái Loading
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnArrow}>←</Text>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Luyện tập</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4255FF" />
          <Text style={styles.loadingText}>Đang tải bài luyện tập...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render trạng thái Lỗi
  if (errorMessage) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnArrow}>←</Text>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Luyện tập</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>Đã xảy ra lỗi</Text>
          <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          <View style={styles.errorButtonsRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
              <Text style={styles.secondaryBtnText}>Quay lại</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={fetchTestData}>
              <Text style={styles.primaryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Render trạng thái không có thẻ
  if (cards.length === 0 || questions.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnArrow}>←</Text>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Luyện tập</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.stateIcon}>✍️</Text>
          <Text style={styles.stateTitle}>Chưa có câu hỏi</Text>
          <Text style={styles.stateSubtitle}>
            Bộ học này chưa có đủ từ vựng để tạo bài luyện tập trắc nghiệm.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Quay về bộ học</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render màn hình Kết quả (Quiz Result)
  if (quizSummary) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnArrow}>←</Text>
            <Text style={styles.backBtnText}>Đóng</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            Kết quả kiểm tra
          </Text>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.resultScrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.resultCard}>
            <Text style={styles.resultCelebrationEmoji}>
              {quizSummary.score >= 80 ? '🎉' : quizSummary.score >= 50 ? '👏' : '💪'}
            </Text>
            <Text style={styles.resultHeaderTitle}>
              {quizSummary.score >= 80
                ? 'Xuất sắc!'
                : quizSummary.score >= 50
                  ? 'Làm tốt lắm!'
                  : 'Cố gắng lên nhé!'}
            </Text>
            <Text style={styles.resultHeaderSubtitle}>
              Bạn đã hoàn thành bài kiểm tra cho bộ "{studySet?.title}".
            </Text>

            {/* Bảng điểm thống kê */}
            <View style={styles.resultStatsRow}>
              <View style={styles.resultStatBox}>
                <Text style={styles.resultStatNumber}>{quizSummary.score}%</Text>
                <Text style={styles.resultStatLabel}>Điểm số</Text>
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatBox}>
                <Text style={[styles.resultStatNumber, { color: '#15803D' }]}>
                  {quizSummary.correctAnswers}
                </Text>
                <Text style={styles.resultStatLabel}>Đúng</Text>
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatBox}>
                <Text style={[styles.resultStatNumber, { color: '#DC2626' }]}>
                  {quizSummary.wrongAnswers}
                </Text>
                <Text style={styles.resultStatLabel}>Sai</Text>
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatBox}>
                <Text style={styles.resultStatNumber}>{quizSummary.totalQuestions}</Text>
                <Text style={styles.resultStatLabel}>Tổng câu</Text>
              </View>
            </View>

            {/* Nút hành động */}
            <View style={styles.resultActionButtons}>
              {quizSummary.wrongAnswers > 0 && (
                <TouchableOpacity
                  style={styles.retryIncorrectBtn}
                  onPress={handleRetryIncorrect}
                  activeOpacity={0.8}>
                  <Text style={styles.retryIncorrectBtnText}>
                    🔄 Làm lại câu sai ({quizSummary.wrongAnswers} câu)
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.restartQuizBtn}
                onPress={handleRestartAll}
                activeOpacity={0.8}>
                <Text style={styles.restartQuizBtnText}>🔁 Làm lại toàn bộ bài kiểm tra</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.backToSetBtn}
                onPress={() => router.back()}
                activeOpacity={0.8}>
                <Text style={styles.backToSetBtnText}>Quay về chi tiết bộ học</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Chi tiết từng câu hỏi */}
          <View style={styles.detailsHeaderRow}>
            <Text style={styles.detailsSectionTitle}>
              Chi tiết câu trả lời ({quizSummary.details.length})
            </Text>
            <TouchableOpacity
              style={styles.toggleDetailsBtn}
              onPress={() => setShowDetails((prev) => !prev)}
              activeOpacity={0.7}>
              <Text style={styles.toggleDetailsBtnText}>
                {showDetails ? 'Thu gọn ▲' : 'Xem chi tiết ▼'}
              </Text>
            </TouchableOpacity>
          </View>

          {showDetails &&
            quizSummary.details.map((item) => (
              <View
                key={item.questionNumber}
                style={[
                  styles.detailItemCard,
                  item.isCorrect ? styles.detailItemCorrect : styles.detailItemWrong,
                ]}>
                <View style={styles.detailItemHeader}>
                  <Text style={styles.detailQuestionNum}>Câu {item.questionNumber}</Text>
                  <View
                    style={[
                      styles.detailStatusBadge,
                      item.isCorrect ? styles.statusBadgeCorrect : styles.statusBadgeWrong,
                    ]}>
                    <Text
                      style={[
                        styles.detailStatusText,
                        item.isCorrect ? styles.statusTextCorrect : styles.statusTextWrong,
                      ]}>
                      {item.isCorrect ? '✓ Đúng' : '✕ Sai'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailTermRow}>
                  <Text style={styles.detailTermText}>{item.term}</Text>
                  {Boolean(item.audio_url && item.audio_url.trim()) && (
                    <TouchableOpacity
                      style={styles.audioBtn}
                      onPress={() => playAudio(item.audio_url)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.audioBtnText}>🔊</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {Boolean(item.pronunciation && item.pronunciation.trim()) && (
                  <Text style={styles.detailPronunciation}>{item.pronunciation?.trim()}</Text>
                )}

                <View style={styles.detailAnswersBlock}>
                  <View style={styles.answerComparisonRow}>
                    <Text style={styles.answerComparisonLabel}>Bạn chọn:</Text>
                    <Text
                      style={[
                        styles.answerComparisonValue,
                        item.isCorrect ? styles.textCorrect : styles.textWrong,
                      ]}>
                      {item.userAnswer || 'Chưa trả lời'}
                    </Text>
                  </View>

                  {!item.isCorrect && (
                    <View style={styles.answerComparisonRow}>
                      <Text style={styles.answerComparisonLabel}>Đáp án đúng:</Text>
                      <Text style={[styles.answerComparisonValue, styles.textCorrect]}>
                        {item.correctAnswer}
                      </Text>
                    </View>
                  )}
                </View>

                {Boolean(item.example && item.example.trim()) && (
                  <View style={styles.detailExampleBox}>
                    <Text style={styles.detailExampleLabel}>💬 Ví dụ:</Text>
                    <Text style={styles.detailExampleText}>"{item.example?.trim()}"</Text>
                  </View>
                )}
              </View>
            ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Câu hỏi hiện tại
  const currentQ = questions[currentIndex];
  const currentSelectedChoice = selectedAnswers[currentIndex];
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Thanh điều hướng trên cùng */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBackPress}>
          <Text style={styles.backBtnArrow}>←</Text>
          <Text style={styles.backBtnText}>Thoát</Text>
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {studySet?.title || 'Luyện tập'}
          </Text>
          {isRetrySession && (
            <View style={styles.retryBadgeTop}>
              <Text style={styles.retryBadgeTopText}>Làm lại câu sai</Text>
            </View>
          )}
          <Text style={styles.counterText}>
            Câu {currentIndex + 1} / {questions.length}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.submitTopBtn}
          onPress={handleSubmitPrompt}
          disabled={submitting}>
          <Text style={styles.submitTopBtnText}>Nộp</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Thanh tiến độ */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      {/* 3. Nội dung câu hỏi và các lựa chọn */}
      <ScrollView
        contentContainerStyle={styles.quizScrollContainer}
        showsVerticalScrollIndicator={false}>
        {/* Khung câu hỏi */}
        <View style={styles.questionCard}>
          <View style={styles.questionBadgeRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.questionTag}>
                <Text style={styles.questionTagText}>CÂU HỎI {currentIndex + 1}</Text>
              </View>
              {Boolean(currentQ.audio_url && currentQ.audio_url.trim()) && (
                <TouchableOpacity
                  style={styles.audioBtn}
                  onPress={() => playAudio(currentQ.audio_url)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.audioBtnText}>🔊 Phát âm</Text>
                </TouchableOpacity>
              )}
            </View>
            {!!currentSelectedChoice ? (
              <View style={styles.answeredPill}>
                <Text style={styles.answeredPillText}>✓ Đã chọn</Text>
              </View>
            ) : (
              <View style={styles.unansweredPill}>
                <Text style={styles.unansweredPillText}>Chưa chọn</Text>
              </View>
            )}
          </View>

          <Text style={styles.questionPrompt}>Nghĩa đúng của từ vựng này là gì?</Text>
          <Text style={styles.termTitle}>{currentQ.term}</Text>

          {!!currentQ.pronunciation && (
            <View style={styles.pronunciationTag}>
              <Text style={styles.pronunciationText}>{currentQ.pronunciation}</Text>
            </View>
          )}
        </View>

        {/* Danh sách các lựa chọn đáp án */}
        <Text style={styles.optionsHeaderTitle}>Chọn 1 đáp án:</Text>
        <View style={styles.optionsList}>
          {currentQ.options.map((option) => {
            const isSelected = currentSelectedChoice === option.text;
            return (
              <TouchableOpacity
                key={option.label}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => handleSelectOption(option.text)}
                activeOpacity={0.8}>
                <View
                  style={[
                    styles.optionLabelCircle,
                    isSelected && styles.optionLabelCircleSelected,
                  ]}>
                  <Text
                    style={[
                      styles.optionLabelText,
                      isSelected && styles.optionLabelTextSelected,
                    ]}>
                    {option.label}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.optionDefinitionText,
                    isSelected && styles.optionDefinitionTextSelected,
                  ]}>
                  {option.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* 4. Thanh chọn nhanh câu hỏi (Question Navigation Chips) */}
      <View style={styles.chipsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}>
          {questions.map((q, idx) => {
            const isAnswered = !!selectedAnswers[idx];
            const isCurrent = idx === currentIndex;
            return (
              <TouchableOpacity
                key={q.card_id}
                style={[
                  styles.questionChip,
                  isAnswered && styles.questionChipAnswered,
                  isCurrent && styles.questionChipCurrent,
                ]}
                onPress={() => setCurrentIndex(idx)}>
                <Text
                  style={[
                    styles.questionChipText,
                    isAnswered && styles.questionChipTextAnswered,
                    isCurrent && styles.questionChipTextCurrent,
                  ]}>
                  {idx + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 5. Thanh điều khiển Trước / Tiếp / Nộp bài */}
      <View style={styles.bottomControlsBar}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}>
          <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDisabled]}>
            ← Trước
          </Text>
        </TouchableOpacity>

        <Text style={styles.answeredSummaryText}>
          {answeredCount}/{questions.length} câu
        </Text>

        {isLastQuestion ? (
          <TouchableOpacity
            style={[styles.navBtn, styles.submitFinalBtn]}
            onPress={handleSubmitPrompt}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitFinalBtnText}>Nộp bài 🎉</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navBtn, styles.nextBtn]}
            onPress={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}>
            <Text style={styles.nextBtnText}>Tiếp →</Text>
          </TouchableOpacity>
        )}
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
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E3856',
    textAlign: 'center',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#939BB4',
    marginTop: 2,
  },
  submitTopBtn: {
    minWidth: 70,
    alignItems: 'flex-end',
    paddingVertical: 4,
  },
  submitTopBtnText: {
    fontSize: 15,
    color: '#15803D',
    fontWeight: '700',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#E8ECF4',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4255FF',
  },
  quizScrollContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  questionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  questionTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  questionTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4255FF',
    letterSpacing: 0.5,
  },
  answeredPill: {
    backgroundColor: '#E6F9F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  answeredPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  unansweredPill: {
    backgroundColor: '#F0F2F7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unansweredPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#939BB4',
  },
  questionPrompt: {
    fontSize: 14,
    color: '#60646C',
    fontWeight: '500',
    marginBottom: 8,
  },
  termTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#2E3856',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  pronunciationTag: {
    backgroundColor: '#F4F6FB',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  pronunciationText: {
    fontSize: 15,
    color: '#4255FF',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  optionsHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  optionCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4255FF',
  },
  optionLabelCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLabelCircleSelected: {
    backgroundColor: '#4255FF',
  },
  optionLabelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#60646C',
  },
  optionLabelTextSelected: {
    color: '#FFFFFF',
  },
  optionDefinitionText: {
    flex: 1,
    fontSize: 15,
    color: '#2E3856',
    fontWeight: '600',
    lineHeight: 21,
  },
  optionDefinitionTextSelected: {
    color: '#4255FF',
    fontWeight: '700',
  },
  chipsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8ECF4',
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  questionChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionChipAnswered: {
    backgroundColor: '#E6F9F0',
  },
  questionChipCurrent: {
    borderWidth: 2,
    borderColor: '#4255FF',
  },
  questionChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#939BB4',
  },
  questionChipTextAnswered: {
    color: '#15803D',
  },
  questionChipTextCurrent: {
    color: '#4255FF',
  },
  bottomControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8ECF4',
  },
  navBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#F0F2F7',
    minWidth: 85,
    alignItems: 'center',
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  navBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E3856',
  },
  navBtnTextDisabled: {
    color: '#939BB4',
  },
  nextBtn: {
    backgroundColor: '#4255FF',
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  submitFinalBtn: {
    backgroundColor: '#15803D',
  },
  submitFinalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  answeredSummaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#60646C',
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
    color: '#60646C',
    fontWeight: '500',
  },
  stateIcon: {
    fontSize: 44,
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
    marginBottom: 20,
    lineHeight: 20,
  },
  errorButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#4255FF',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#E8ECF4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  secondaryBtnText: {
    color: '#2E3856',
    fontSize: 15,
    fontWeight: '600',
  },
  resultScrollContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    paddingBottom: 36,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 24,
  },
  resultCelebrationEmoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  resultHeaderTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 6,
  },
  resultHeaderSubtitle: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  resultStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    marginBottom: 20,
  },
  resultStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  resultStatNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4255FF',
  },
  resultStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#939BB4',
    marginTop: 4,
  },
  resultStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E8ECF4',
  },
  resultActionButtons: {
    width: '100%',
    gap: 10,
  },
  restartQuizBtn: {
    backgroundColor: '#4255FF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  restartQuizBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  retryIncorrectBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  retryIncorrectBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  backToSetBtn: {
    backgroundColor: '#F0F2F7',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  backToSetBtnText: {
    color: '#2E3856',
    fontSize: 15,
    fontWeight: '700',
  },
  detailsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  toggleDetailsBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  toggleDetailsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4255FF',
  },
  retryBadgeTop: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  retryBadgeTopText: {
    fontSize: 11,
    color: '#C2410C',
    fontWeight: '700',
  },
  detailsSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 0,
  },
  detailItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginBottom: 12,
  },
  detailItemCorrect: {
    borderColor: '#86EFAC',
  },
  detailItemWrong: {
    borderColor: '#FCA5A5',
  },
  detailItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailQuestionNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#939BB4',
  },
  detailStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeCorrect: {
    backgroundColor: '#E6F9F0',
  },
  statusBadgeWrong: {
    backgroundColor: '#FEE2E2',
  },
  detailStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextCorrect: {
    color: '#15803D',
  },
  statusTextWrong: {
    color: '#DC2626',
  },
  detailTermRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailTermText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E3856',
  },
  detailPronunciation: {
    fontSize: 13,
    color: '#4255FF',
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: 6,
  },
  detailAnswersBlock: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F7',
    gap: 4,
  },
  answerComparisonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  answerComparisonLabel: {
    fontSize: 13,
    color: '#939BB4',
    fontWeight: '600',
    width: 95,
  },
  answerComparisonValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#2E3856',
  },
  detailExampleBox: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#4255FF',
  },
  detailExampleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4255FF',
    marginBottom: 2,
  },
  detailExampleText: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 18,
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
  textCorrect: {
    color: '#15803D',
  },
  textWrong: {
    color: '#DC2626',
  },
});
