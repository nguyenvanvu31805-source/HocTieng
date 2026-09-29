import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { AssignmentDetail, AssignmentMode } from '@/types/assignment';
import assignmentService from '@/services/assignmentService';

const MODE_CONFIG: Record<
  AssignmentMode,
  { label: string; icon: string; color: string; bg: string; actionText: string; routeSuffix: string }
> = {
  TEST: {
    label: 'Luyện tập (Test)',
    icon: '✍️',
    color: '#4255FF',
    bg: '#EEF2FF',
    actionText: 'Bắt đầu làm bài kiểm tra',
    routeSuffix: 'test',
  },
  FLASHCARDS: {
    label: 'Học Flashcards',
    icon: '🗂️',
    color: '#10B981',
    bg: '#ECFDF5',
    actionText: 'Bắt đầu học Flashcards',
    routeSuffix: 'flashcards',
  },
  MATCH: {
    label: 'Ghép thẻ (Match)',
    icon: '🎮',
    color: '#6366F1',
    bg: '#EEF2FF',
    actionText: 'Bắt đầu Ghép thẻ',
    routeSuffix: 'match',
  },
  LEARN: {
    label: 'Học thẻ',
    icon: '🧠',
    color: '#F59E0B',
    bg: '#FEF3C7',
    actionText: 'Bắt đầu học thẻ',
    routeSuffix: 'learn',
  },
};

function formatDeadline(deadlineStr: string | null): { formatted: string; isPast: boolean } | null {
  if (!deadlineStr) return null;
  const d = new Date(deadlineStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const isPast = d.getTime() < now.getTime();
  const formatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { formatted, isPast };
}

export default function AssignmentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchAssignment = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMessage('');

    try {
      const data = await assignmentService.getAssignmentDetail(id);
      setAssignment(data);
    } catch (error: any) {
      const msg =
        error?.status === 404
          ? 'Không tìm thấy bài tập hoặc bài tập đã bị xóa.'
          : error?.status === 403
            ? 'Bạn không có quyền truy cập bài tập này.'
            : error?.data?.message ||
              error?.message ||
              'Không thể tải chi tiết bài tập. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAssignment();
  }, [fetchAssignment]);

  const isTeacher =
    user?.role === 'ADMIN' ||
    (user?.role === 'TEACHER' && assignment?.teacher_id === user?.user_id);

  // Xử lý bắt đầu làm bài tập
  const handleStartAssignment = () => {
    if (!assignment) return;
    const modeInfo = MODE_CONFIG[assignment.mode] || MODE_CONFIG.TEST;
    router.push(`/study-set/${assignment.set_id}/${modeInfo.routeSuffix}` as any);
  };

  // Xử lý xem bộ học
  const handleViewStudySet = () => {
    if (!assignment) return;
    router.push(`/study-set/${assignment.set_id}` as any);
  };

  // Xử lý xóa bài tập (dành cho giáo viên)
  const handleDeleteAssignment = () => {
    if (!assignment || deleting) return;

    Alert.alert(
      'Xác nhận xóa bài tập',
      `Bạn có chắc chắn muốn xóa bài tập "${assignment.title}" không? Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const res = await assignmentService.deleteAssignment(assignment.assignment_id);
              Alert.alert('Thành công', res.message, [
                {
                  text: 'Đồng ý',
                  onPress: () => router.back(),
                },
              ]);
            } catch (error: any) {
              const msg =
                error?.data?.message ||
                error?.message ||
                'Không thể xóa bài tập. Vui lòng thử lại.';
              Alert.alert('Lỗi', msg);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnArrow}>←</Text>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Bài tập</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.stateIcon}>🔐</Text>
          <Text style={styles.stateTitle}>Yêu cầu đăng nhập</Text>
          <Text style={styles.stateSubtitle}>
            Vui lòng đăng nhập để xem thông tin bài tập của lớp học.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/login' as any)}>
            <Text style={styles.primaryBtnText}>Đăng nhập ngay</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnArrow}>←</Text>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Chi tiết bài tập</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4255FF" />
          <Text style={styles.loadingText}>Đang tải chi tiết bài tập...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !assignment) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnArrow}>←</Text>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Chi tiết bài tập</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>Không thể tải bài tập</Text>
          <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          <View style={styles.errorButtonsRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
              <Text style={styles.secondaryBtnText}>Quay lại</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={fetchAssignment}>
              <Text style={styles.primaryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const modeInfo = MODE_CONFIG[assignment.mode] || MODE_CONFIG.TEST;
  const deadlineInfo = formatDeadline(assignment.deadline);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. TopBar Navigation */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnArrow}>←</Text>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          Chi tiết bài tập
        </Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        {/* 2. Thẻ Thông tin chính của Bài tập */}
        <View style={styles.mainCard}>
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.modeBadge,
                { backgroundColor: modeInfo.bg, borderColor: modeInfo.color },
              ]}>
              <Text style={styles.modeBadgeIcon}>{modeInfo.icon}</Text>
              <Text style={[styles.modeBadgeText, { color: modeInfo.color }]}>
                {modeInfo.label}
              </Text>
            </View>

            {deadlineInfo ? (
              <View
                style={[
                  styles.deadlineBadge,
                  deadlineInfo.isPast ? styles.deadlineExpired : styles.deadlineActive,
                ]}>
                <Text
                  style={[
                    styles.deadlineBadgeText,
                    deadlineInfo.isPast
                      ? styles.deadlineExpiredText
                      : styles.deadlineActiveText,
                  ]}>
                  {deadlineInfo.isPast ? '⚠️ Đã hết hạn' : '⏰ Còn hạn'}
                </Text>
              </View>
            ) : (
              <View style={[styles.deadlineBadge, styles.deadlineNone]}>
                <Text style={styles.deadlineNoneText}>Không giới hạn</Text>
              </View>
            )}
          </View>

          <Text style={styles.assignmentTitle}>{assignment.title}</Text>

          {!!assignment.description && (
            <Text style={styles.assignmentDescription}>{assignment.description}</Text>
          )}

          {/* Chi tiết hạn nộp */}
          {deadlineInfo && (
            <View style={styles.deadlineContainer}>
              <Text style={styles.deadlineTitleLabel}>Hạn hoàn thành:</Text>
              <Text
                style={[
                  styles.deadlineValueText,
                  deadlineInfo.isPast && styles.deadlineExpiredText,
                ]}>
                {deadlineInfo.formatted}
              </Text>
            </View>
          )}

          {/* Lớp học trực thuộc */}
          <View style={styles.classInfoRow}>
            <Text style={styles.classInfoLabel}>Lớp học:</Text>
            <Text style={styles.classInfoName}>🏫 {assignment.class_name}</Text>
          </View>
        </View>

        {/* 3. Khối Bộ học liên kết */}
        <View style={styles.studySetCard}>
          <View style={styles.studySetHeader}>
            <Text style={styles.studySetSectionTitle}>Bộ từ vựng cần học</Text>
            <TouchableOpacity onPress={handleViewStudySet}>
              <Text style={styles.studySetLinkText}>Xem bộ thẻ ›</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.studySetBox}
            onPress={handleViewStudySet}
            activeOpacity={0.85}>
            <View style={styles.setCardLeft}>
              <View style={styles.setCardIcon}>
                <Text style={styles.setCardIconEmoji}>📚</Text>
              </View>
              <View style={styles.setCardInfo}>
                <Text style={styles.studySetTitle} numberOfLines={1}>
                  {assignment.study_set_title}
                </Text>
                <Text style={styles.cardCountText}>
                  {assignment.card_count} thẻ từ vựng
                </Text>
              </View>
            </View>
            <Text style={styles.setArrow}>›</Text>
          </TouchableOpacity>

          {!!assignment.study_set_description && (
            <Text style={styles.studySetDesc} numberOfLines={2}>
              {assignment.study_set_description}
            </Text>
          )}
        </View>

        {/* 4. Nút hành động chính: Bắt đầu làm bài */}
        <TouchableOpacity
          style={[styles.startActionBtn, { backgroundColor: modeInfo.color }]}
          onPress={handleStartAssignment}
          activeOpacity={0.85}>
          <Text style={styles.startActionBtnIcon}>{modeInfo.icon}</Text>
          <Text style={styles.startActionBtnText}>{modeInfo.actionText}</Text>
        </TouchableOpacity>

        {/* 5. Nút Xóa bài tập (Nếu là Giáo viên sở hữu lớp) */}
        {isTeacher && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteAssignment}
            disabled={deleting}
            activeOpacity={0.8}>
            {deleting ? (
              <ActivityIndicator size="small" color="#D93025" />
            ) : (
              <>
                <Text style={styles.deleteBtnIcon}>🗑️</Text>
                <Text style={styles.deleteBtnText}>Xóa bài tập này</Text>
              </>
            )}
          </TouchableOpacity>
        )}
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
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF4',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 70,
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
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#2E3856',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 36,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginBottom: 16,
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  modeBadgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  deadlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deadlineBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deadlineActive: {
    backgroundColor: '#ECFDF5',
  },
  deadlineActiveText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  deadlineExpired: {
    backgroundColor: '#FEF2F2',
  },
  deadlineExpiredText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  deadlineNone: {
    backgroundColor: '#F6F7FB',
  },
  deadlineNoneText: {
    color: '#60646C',
    fontSize: 12,
    fontWeight: '600',
  },
  assignmentTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 10,
    lineHeight: 28,
  },
  assignmentDescription: {
    fontSize: 14,
    color: '#60646C',
    lineHeight: 20,
    marginBottom: 16,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7FB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  deadlineTitleLabel: {
    fontSize: 13,
    color: '#60646C',
    fontWeight: '600',
    marginRight: 6,
  },
  deadlineValueText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2E3856',
  },
  classInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classInfoLabel: {
    fontSize: 13,
    color: '#939BB4',
    marginRight: 6,
  },
  classInfoName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E3856',
  },
  studySetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginBottom: 20,
  },
  studySetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  studySetSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2E3856',
  },
  studySetLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4255FF',
  },
  studySetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F6F7FB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  setCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  setCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  setCardIconEmoji: {
    fontSize: 20,
  },
  setCardInfo: {
    flex: 1,
  },
  studySetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 2,
  },
  cardCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#60646C',
  },
  setArrow: {
    fontSize: 22,
    color: '#939BB4',
    marginLeft: 8,
  },
  studySetDesc: {
    fontSize: 13,
    color: '#60646C',
    marginTop: 8,
    lineHeight: 18,
  },
  startActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  startActionBtnIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  startActionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  deleteBtnIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
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
    fontSize: 48,
    marginBottom: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 8,
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    backgroundColor: '#E8ECF4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  secondaryBtnText: {
    color: '#2E3856',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#4255FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
