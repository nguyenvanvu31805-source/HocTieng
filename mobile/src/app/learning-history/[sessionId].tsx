import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import studySessionService from '@/services/studySessionService';
import { StudySessionItem } from '@/types/studySession';
import {
  formatDateTime,
  formatDuration,
  getModeMeta,
} from '../learning-history';

export default function SessionDetailScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [session, setSession] = useState<StudySessionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      const parsedId = Number(sessionId);
      if (!sessionId || isNaN(parsedId) || parsedId <= 0) {
        setErrorMessage('Mã phiên học không hợp lệ.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage('');
      try {
        const data = await studySessionService.getSessionDetail(parsedId);
        if (data) {
          setSession(data);
        } else {
          setErrorMessage('Không tìm thấy phiên học hoặc bạn không có quyền xem.');
        }
      } catch (err: any) {
        setErrorMessage(
          err?.data?.message || err?.message || 'Không thể tải chi tiết phiên học.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [sessionId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Chi tiết phiên học</Text>
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4255FF" />
          <Text style={styles.loadingText}>Đang tải chi tiết...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !session) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Chi tiết phiên học</Text>
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Không thể xem phiên học</Text>
          <Text style={styles.errorMessageText}>
            {errorMessage || 'Phiên học không tồn tại hoặc đã bị xóa.'}
          </Text>
          <TouchableOpacity
            style={styles.backActionBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}>
            <Text style={styles.backActionBtnText}>Quay lại danh sách</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const modeMeta = getModeMeta(session.mode);
  const isCompleted = session.status === 'COMPLETED' || Boolean(session.ended_at);
  const displayTitle =
    session.set_title ||
    (session.mode === 'WEAK_REVIEW' ? 'Ôn tập từ vựng yếu' : 'Bộ từ vựng');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Chi tiết phiên học</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Card 1: Overview & Study Set */}
        <View style={styles.overviewCard}>
          <View style={styles.badgeRow}>
            <View style={[styles.modeBadge, { backgroundColor: modeMeta.bg }]}>
              <Text style={styles.modeIcon}>{modeMeta.icon}</Text>
              <Text style={[styles.modeLabel, { color: modeMeta.color }]}>
                {modeMeta.label}
              </Text>
            </View>
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
          </View>

          <Text style={styles.setTitleText}>{displayTitle}</Text>

          {session.set_category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>📁 {session.set_category}</Text>
            </View>
          )}

          {session.set_description && (
            <Text style={styles.setDescription}>{session.set_description}</Text>
          )}
        </View>

        {/* Score Card if TEST mode */}
        {session.mode === 'TEST' && session.score !== null && (
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>KẾT QUẢ BÀI KIỂM TRA</Text>
            <Text style={styles.scoreValue}>{Number(session.score).toFixed(0)}%</Text>
            <Text style={styles.scoreSubtext}>
              {Number(session.score) >= 80
                ? 'Xuất sắc! Bạn đã nắm rất vững kiến thức 🎉'
                : Number(session.score) >= 50
                  ? 'Khá tốt! Hãy ôn lại các từ chưa nhớ để đạt điểm tối đa.'
                  : 'Hãy ôn tập thêm các từ sai để cải thiện kết quả.'}
            </Text>
          </View>
        )}

        {/* Card 2: Detailed Metrics Grid */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionHeaderTitle}>Thông tin chi tiết</Text>
          <View style={styles.detailCard}>
            {/* Hàng 1: Số thẻ đã học */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Text style={styles.detailIcon}>🃏</Text>
              </View>
              <View style={styles.detailTextBox}>
                <Text style={styles.detailLabel}>Số thẻ đã học</Text>
                <Text style={styles.detailValue}>{session.cards_studied || 0} thẻ</Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            {/* Hàng 2: Thời lượng */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Text style={styles.detailIcon}>⏱</Text>
              </View>
              <View style={styles.detailTextBox}>
                <Text style={styles.detailLabel}>Thời lượng học</Text>
                <Text style={styles.detailValue}>
                  {formatDuration(session.duration_seconds)}
                </Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            {/* Hàng 3: Thời gian bắt đầu */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Text style={styles.detailIcon}>🕒</Text>
              </View>
              <View style={styles.detailTextBox}>
                <Text style={styles.detailLabel}>Bắt đầu</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(session.started_at)}
                </Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            {/* Hàng 4: Thời gian kết thúc */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Text style={styles.detailIcon}>🏁</Text>
              </View>
              <View style={styles.detailTextBox}>
                <Text style={styles.detailLabel}>Kết thúc</Text>
                <Text style={styles.detailValue}>
                  {session.ended_at
                    ? formatDateTime(session.ended_at)
                    : 'Chưa kết thúc'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {session.set_id && (
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => router.push(`/study-set/${session.set_id}` as any)}
              activeOpacity={0.85}>
              <Text style={styles.primaryActionBtnText}>📚 Học lại bộ này</Text>
            </TouchableOpacity>
          )}

          {session.mode === 'WEAK_REVIEW' && (
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => router.push('/review/weak' as any)}
              activeOpacity={0.85}>
              <Text style={styles.primaryActionBtnText}>🎯 Ôn tiếp từ yếu</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}>
            <Text style={styles.secondaryActionBtnText}>Quay lại danh sách</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
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
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E3856',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  modeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusCompleted: {
    backgroundColor: '#DCFCE7',
  },
  statusCompletedText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  statusInProgress: {
    backgroundColor: '#FEF3C7',
  },
  statusInProgressText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  setTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E3856',
    lineHeight: 24,
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4255FF',
  },
  setDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  scoreCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#D97706',
    marginBottom: 6,
  },
  scoreSubtext: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 18,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 10,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  detailIcon: {
    fontSize: 18,
  },
  detailTextBox: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  actionContainer: {
    gap: 12,
  },
  primaryActionBtn: {
    backgroundColor: '#4255FF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryActionBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: 44,
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
    marginBottom: 20,
    lineHeight: 20,
  },
  backActionBtn: {
    backgroundColor: '#4255FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  backActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
