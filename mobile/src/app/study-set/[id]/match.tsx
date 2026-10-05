import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import api from '@/services/api';
import cardProgressService from '@/services/cardProgressService';
import assignmentService from '@/services/assignmentService';
import useStudySession from '@/hooks/useStudySession';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 44) / 2;
const MAX_MATCH_PAIRS = 6; // Số lượng cặp ghép tối đa trong một ván chơi

// Hàm xáo trộn mảng ngẫu nhiên (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Định dạng thời gian mm:ss
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function MatchScreen() {
  const router = useRouter();
  const { id, assignmentId, classId } = useLocalSearchParams<{
    id: string;
    assignmentId?: string;
    classId?: string;
  }>();
  const { isAuthenticated } = useAuth();

  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [sourceCards, setSourceCards] = useState<Card[]>([]);
  const [termCards, setTermCards] = useState<Card[]>([]);
  const [definitionCards, setDefinitionCards] = useState<Card[]>([]);
  const [assignmentSubmitted, setAssignmentSubmitted] = useState(false);
  const assignmentSubmittedRef = useRef(false);

  // Thẻ đang được chọn
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<number | null>(null);

  // Danh sách các ID thẻ đã ghép đúng
  const [matchedCardIds, setMatchedCardIds] = useState<number[]>([]);

  // Cặp ghép sai tạm thời đang hiển thị màu đỏ
  const [wrongPair, setWrongPair] = useState<{ termId: number; defId: number } | null>(null);

  // Trạng thái trò chơi & bộ bấm giờ
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Tích hợp study session và streak cho Match mode
  const { recordCardStudied, completeSession } = useStudySession({
    setId: id,
    mode: 'MATCH',
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bắt đầu một ván chơi mới với danh sách thẻ
  const initGame = useCallback((cards: Card[]) => {
    const validCards = cards
      .filter((c) => !!c.term?.trim() && !!c.definition?.trim())
      .slice(0, MAX_MATCH_PAIRS);

    setSourceCards(validCards);
    setTermCards(shuffleArray(validCards));
    setDefinitionCards(shuffleArray(validCards));

    setSelectedTermId(null);
    setSelectedDefinitionId(null);
    setMatchedCardIds([]);
    setWrongPair(null);
    setElapsedSeconds(0);
    setWrongAttempts(0);
    setIsFinished(false);
    setIsPlaying(validCards.length > 0);
  }, []);

  // Tải dữ liệu bộ học từ backend
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMessage('');

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

      if (cardsRes.success && Array.isArray(cardsRes.data)) {
        initGame(cardsRes.data);
      } else {
        initGame([]);
      }
    } catch (err: any) {
      const msg =
        err?.status === 404
          ? 'Không tìm thấy bộ học hoặc bộ học đã bị xóa.'
          : err?.data?.message ||
            err?.message ||
            'Không thể tải dữ liệu ghép thẻ. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [id, initGame]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Bộ đếm thời gian (Stopwatch)
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  // Tập hợp các thẻ đã ghép để tra cứu nhanh O(1)
  const matchedSet = useMemo(() => new Set(matchedCardIds), [matchedCardIds]);
  const totalPairs = sourceCards.length;

  // Xử lý kiểm tra khi cả 2 bên (Term & Definition) đều đã được chọn
  const verifyPair = async (termId: number, defId: number) => {
    if (termId === defId) {
      // ✅ GHÉP ĐÚNG!
      const newMatched = [...matchedCardIds, termId];
      setMatchedCardIds(newMatched);
      setSelectedTermId(null);
      setSelectedDefinitionId(null);
      setWrongPair(null);

      // Cập nhật tiến độ card_progress trong nền nếu đã đăng nhập
      if (isAuthenticated) {
        cardProgressService.reviewCard(termId, true).catch(() => {});
      }

      recordCardStudied();

      // Kiểm tra nếu đã hoàn thành toàn bộ các cặp
      if (newMatched.length === totalPairs) {
        setIsPlaying(false);
        setIsFinished(true);
        const calculatedScore = Math.max(10, 100 - wrongAttempts * 5);
        const sessionId = await completeSession({ score: calculatedScore, cardsStudied: totalPairs });

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
    } else {
      // ❌ GHÉP SAI!
      setWrongPair({ termId, defId });
      setWrongAttempts((prev) => prev + 1);

      // Tự động xóa màu đỏ sau 600ms
      setTimeout(() => {
        setWrongPair(null);
        setSelectedTermId(null);
        setSelectedDefinitionId(null);
      }, 600);
    }
  };

  // Người dùng chạm vào thẻ Thuật ngữ (Term)
  const handlePressTerm = (cardId: number) => {
    if (matchedSet.has(cardId) || wrongPair) return;

    if (selectedTermId === cardId) {
      // Chạm lại để bỏ chọn
      setSelectedTermId(null);
      return;
    }

    setSelectedTermId(cardId);
    if (selectedDefinitionId !== null) {
      verifyPair(cardId, selectedDefinitionId);
    }
  };

  // Người dùng chạm vào thẻ Định nghĩa (Definition)
  const handlePressDefinition = (cardId: number) => {
    if (matchedSet.has(cardId) || wrongPair) return;

    if (selectedDefinitionId === cardId) {
      // Chạm lại để bỏ chọn
      setSelectedDefinitionId(null);
      return;
    }

    setSelectedDefinitionId(cardId);
    if (selectedTermId !== null) {
      verifyPair(selectedTermId, cardId);
    }
  };

  // Chơi lại ván mới
  const handleRestart = () => {
    initGame(sourceCards);
  };

  // Xác nhận khi người dùng muốn thoát giữa ván chơi
  const handleBackPress = () => {
    if (isPlaying && matchedCardIds.length > 0) {
      Alert.alert(
        'Rời trò chơi?',
        'Bạn đang trong ván chơi Ghép thẻ. Bạn có chắc muốn thoát ra không?',
        [
          { text: 'Ở lại chơi tiếp', style: 'cancel' },
          { text: 'Thoát', style: 'destructive', onPress: () => router.back() },
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
          <Text style={styles.topBarTitle}>Ghép thẻ</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Đang chuẩn bị ván chơi...</Text>
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
          <Text style={styles.topBarTitle}>Ghép thẻ</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>Đã xảy ra lỗi</Text>
          <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
              <Text style={styles.secondaryBtnText}>Quay lại</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={fetchData}>
              <Text style={styles.primaryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Render nếu không đủ thẻ (ít hơn 2 thẻ)
  if (sourceCards.length < 2) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnArrow}>←</Text>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Ghép thẻ</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.stateIcon}>🎮</Text>
          <Text style={styles.stateTitle}>Không đủ thẻ để chơi</Text>
          <Text style={styles.stateSubtitle}>
            Bộ học này cần có ít nhất 2 thẻ từ vựng để chơi trò chơi Ghép thẻ.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Quay về bộ học</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render màn hình Hoàn thành (Victory Screen)
  if (isFinished) {
    const accuracy =
      totalPairs + wrongAttempts > 0
        ? Math.round((totalPairs / (totalPairs + wrongAttempts)) * 100)
        : 100;

    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnArrow}>←</Text>
            <Text style={styles.backBtnText}>Đóng</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            Hoàn thành Ghép thẻ
          </Text>
          <View style={{ width: 70 }} />
        </View>

        <View style={styles.finishContainer}>
          <View style={styles.finishCard}>
            <Text style={styles.finishEmoji}>🏆</Text>
            <Text style={styles.finishTitle}>Xuất sắc!</Text>
            <Text style={styles.finishSubtitle}>
              Bạn đã ghép đúng tất cả các cặp từ trong bộ "{studySet?.title}".
            </Text>

            {/* Banner nộp bài tập nếu làm trong khuôn khổ Assignment */}
            {(assignmentSubmitted || assignmentId) && (
              <View style={styles.assignmentSuccessBanner}>
                <Text style={styles.assignmentSuccessIcon}>🎉</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assignmentSuccessTitle}>Đã hoàn thành bài tập Ghép thẻ!</Text>
                  <Text style={styles.assignmentSuccessSub}>
                    Thời gian: {formatTime(elapsedSeconds)} (Độ chính xác: {accuracy}%) – Kết quả đã được ghi nhận vào lớp học.
                  </Text>
                </View>
              </View>
            )}

            {/* Bảng kết quả thành tích */}
            <View style={styles.finishStatsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{formatTime(elapsedSeconds)}</Text>
                <Text style={styles.statLabel}>⏱️ Thời gian</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#15803D' }]}>
                  {totalPairs}/{totalPairs}
                </Text>
                <Text style={styles.statLabel}>Cặp đã ghép</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#6366F1' }]}>
                  {accuracy}%
                </Text>
                <Text style={styles.statLabel}>Độ chính xác</Text>
              </View>
            </View>

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

            {/* Nút hành động */}
            <TouchableOpacity
              style={styles.restartGameBtn}
              onPress={handleRestart}
              activeOpacity={0.8}>
              <Text style={styles.restartGameBtnText}>🔄 Chơi lại ván mới</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToSetBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}>
              <Text style={styles.backToSetBtnText}>Quay về chi tiết bộ học</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const progressPercent = totalPairs > 0 ? (matchedCardIds.length / totalPairs) * 100 : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Thanh điều hướng & Đồng hồ bấm giờ */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBackPress}>
          <Text style={styles.backBtnArrow}>←</Text>
          <Text style={styles.backBtnText}>Thoát</Text>
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {studySet?.title || 'Ghép thẻ'}
          </Text>
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>⏱️ {formatTime(elapsedSeconds)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.restartTopBtn} onPress={handleRestart}>
          <Text style={styles.restartTopBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Thanh tiến độ ghép cặp */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      {/* Dòng hướng dẫn & Tiến độ */}
      <View style={styles.subHeaderBar}>
        <Text style={styles.instructionText}>
          Chạm 1 Thuật ngữ và 1 Định nghĩa tương ứng
        </Text>
        <Text style={styles.pairsCountText}>
          {matchedCardIds.length}/{totalPairs} cặp
        </Text>
      </View>

      {/* 3. Bàn chơi: 2 cột (Cột Thuật ngữ & Cột Định nghĩa) */}
      <ScrollView
        contentContainerStyle={styles.boardScrollContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.columnsRow}>
          {/* CỘT 1: THUẬT NGỮ (TERMS) */}
          <View style={styles.columnContainer}>
            <View style={styles.columnHeaderBox}>
              <Text style={styles.columnHeaderText}>THUẬT NGỮ</Text>
            </View>

            {termCards.map((card) => {
              const isMatched = matchedSet.has(card.card_id);
              const isSelected = selectedTermId === card.card_id;
              const isWrong = wrongPair?.termId === card.card_id;

              return (
                <TouchableOpacity
                  key={`term-${card.card_id}`}
                  style={[
                    styles.matchTile,
                    isSelected && styles.tileSelected,
                    isMatched && styles.tileMatched,
                    isWrong && styles.tileWrong,
                  ]}
                  onPress={() => handlePressTerm(card.card_id)}
                  disabled={isMatched || !!wrongPair}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.termTileText,
                      isSelected && styles.textSelected,
                      isMatched && styles.textMatched,
                      isWrong && styles.textWrong,
                    ]}
                    numberOfLines={3}>
                    {card.term}
                  </Text>
                  {isMatched && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* CỘT 2: ĐỊNH NGHĨA (DEFINITIONS) */}
          <View style={styles.columnContainer}>
            <View style={[styles.columnHeaderBox, styles.defHeaderBox]}>
              <Text style={[styles.columnHeaderText, styles.defHeaderText]}>
                ĐỊNH NGHĨA
              </Text>
            </View>

            {definitionCards.map((card) => {
              const isMatched = matchedSet.has(card.card_id);
              const isSelected = selectedDefinitionId === card.card_id;
              const isWrong = wrongPair?.defId === card.card_id;

              return (
                <TouchableOpacity
                  key={`def-${card.card_id}`}
                  style={[
                    styles.matchTile,
                    isSelected && styles.tileSelected,
                    isMatched && styles.tileMatched,
                    isWrong && styles.tileWrong,
                  ]}
                  onPress={() => handlePressDefinition(card.card_id)}
                  disabled={isMatched || !!wrongPair}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.definitionTileText,
                      isSelected && styles.textSelected,
                      isMatched && styles.textMatched,
                      isWrong && styles.textWrong,
                    ]}
                    numberOfLines={4}>
                    {card.definition}
                  </Text>
                  {isMatched && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
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
    color: '#6366F1',
    fontWeight: '700',
    marginRight: 4,
  },
  backBtnText: {
    fontSize: 15,
    color: '#6366F1',
    fontWeight: '600',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  topBarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E3856',
    textAlign: 'center',
  },
  timerBadge: {
    marginTop: 2,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
    fontVariant: ['tabular-nums'],
  },
  restartTopBtn: {
    minWidth: 70,
    alignItems: 'flex-end',
    paddingVertical: 4,
  },
  restartTopBtnText: {
    fontSize: 18,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#E8ECF4',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  subHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF4',
  },
  instructionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#60646C',
    flex: 1,
  },
  pairsCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 8,
  },
  boardScrollContainer: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 28,
  },
  columnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  columnContainer: {
    width: COLUMN_WIDTH,
    gap: 10,
  },
  columnHeaderBox: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  columnHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  defHeaderBox: {
    backgroundColor: '#E6F9F0',
  },
  defHeaderText: {
    color: '#15803D',
  },
  matchTile: {
    minHeight: 82,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  tileSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  tileMatched: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    opacity: 0.6,
  },
  tileWrong: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  termTileText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E3856',
    textAlign: 'center',
  },
  definitionTileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 18,
  },
  textSelected: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  textMatched: {
    color: '#059669',
  },
  textWrong: {
    color: '#DC2626',
    fontWeight: '800',
  },
  checkIcon: {
    position: 'absolute',
    top: 4,
    right: 8,
    fontSize: 14,
    color: '#10B981',
    fontWeight: '900',
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
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#6366F1',
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
  finishContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  finishCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  finishEmoji: {
    fontSize: 54,
    marginBottom: 10,
  },
  finishTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 6,
  },
  finishSubtitle: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  finishStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    marginBottom: 22,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E3856',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#939BB4',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E8ECF4',
  },
  restartGameBtn: {
    width: '100%',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  restartGameBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  backToSetBtn: {
    width: '100%',
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
    width: '100%',
    backgroundColor: '#4255FF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  backToClassBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  backToAssignmentBtn: {
    width: '100%',
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  backToAssignmentBtnText: {
    color: '#4255FF',
    fontSize: 15,
    fontWeight: '700',
  },
});
