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
import {
  AssignmentDetail,
  AssignmentMode,
  AssignmentSubmission,
  AssignmentSubmissionStatus,
} from '@/types/assignment';
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
  ALL: {
    label: 'Tất cả chế độ',
    icon: '🌟',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    actionText: 'Bắt đầu học',
    routeSuffix: 'flashcards',
  },
};

const STATUS_CONFIG: Record<
  AssignmentSubmissionStatus,
  { label: string; icon: string; color: string; bg: string; border: string }
> = {
  NOT_STARTED: {
    label: 'Chưa làm',
    icon: '⚪',
    color: '#64748B',
    bg: '#F1F5F9',
    border: '#CBD5E1',
  },
  IN_PROGRESS: {
    label: 'Đang làm',
    icon: '🟡',
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FDE68A',
  },
  COMPLETED: {
    label: 'Đã hoàn thành',
    icon: '🟢',
    color: '#15803D',
    bg: '#DCFCE7',
    border: '#86EFAC',
  },
  OVERDUE: {
    label: 'Quá hạn',
    icon: '🔴',
    color: '#DC2626',
    bg: '#FEE2E2',
    border: '#FECACA',
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

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AssignmentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchAssignment = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMessage('');

    try {
      const [data, subData] = await Promise.all([
        assignmentService.getAssignmentDetail(id),
        assignmentService.getMySubmission(id).catch(() => null),
      ]);
      setAssignment(data);
      setSubmission(subData);
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

  const modeInfo = assignment ? MODE_CONFIG[assignment.mode] || MODE_CONFIG.TEST : MODE_CONFIG.TEST;
  const deadlineInfo = assignment ? formatDeadline(assignment.deadline) : null;
  const studentStatus: AssignmentSubmissionStatus = submission?.status || (deadlineInfo?.isPast ? 'OVERDUE' : 'NOT_STARTED');
  const statusInfo = STATUS_CONFIG[studentStatus] || STATUS_CONFIG.NOT_STARTED;

  // Xử lý bắt đầu làm bài tập mới (Chưa làm)
  const handleStartAssignment = async () => {
    if (!assignment || starting) return;
    if (studentStatus === 'OVERDUE') {
      Alert.alert('Không thể bắt đầu', 'Bài tập này đã quá hạn nộp.');
      return;
    }

    setStarting(true);
    try {
      const res = await assignmentService.startAssignment(assignment.assignment_id);
      setSubmission(res);
      router.push({
        pathname: `/study-set/[id]/${modeInfo.routeSuffix}` as any,
        params: {
          id: String(assignment.set_id),
          assignmentId: String(assignment.assignment_id),
          classId: String(assignment.class_id),
        },
      });
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể bắt đầu bài tập.');
    } finally {
      setStarting(false);
    }
  };

  // Xử lý tiếp tục làm bài tập (Đang làm)
  const handleContinueAssignment = () => {
    if (!assignment) return;
    router.push({
      pathname: `/study-set/[id]/${modeInfo.routeSuffix}` as any,
      params: {
        id: String(assignment.set_id),
        assignmentId: String(assignment.assignment_id),
        classId: String(assignment.class_id),
      },
    });
  };

  // Xử lý xem kết quả kiểm tra
  const handleViewTestResult = () => {
    const resId = submission?.result_id || submission?.test_result_id;
    if (!assignment || !resId) return;
    router.push({
      pathname: `/study-set/[id]/test` as any,
      params: {
        id: String(assignment.set_id),
        assignmentId: String(assignment.assignment_id),
        classId: String(assignment.class_id),
        reviewResultId: String(resId),
      },
    });
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
              <Text style={styles.secondaryBtnText}>Quay lại lớp học</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={fetchAssignment}>
              <Text style={styles.primaryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. TopBar Navigation */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (assignment?.class_id) {
              router.replace(`/class/${assignment.class_id}` as any);
            } else {
              router.back();
            }
          }}>
          <Text style={styles.backBtnArrow}>←</Text>
          <Text style={styles.backBtnText}>Lớp học</Text>
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

        {/* 3. Khối Trạng thái làm bài của Học sinh */}
        {!isTeacher && (
          <View style={styles.statusCard}>
            <Text style={styles.statusCardTitle}>Trạng thái của bạn</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: statusInfo.bg, borderColor: statusInfo.border },
                ]}>
                <Text style={styles.statusPillIcon}>{statusInfo.icon}</Text>
                <Text style={[styles.statusPillText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>

            {studentStatus === 'COMPLETED' && assignment.mode === 'TEST' && submission?.score !== null && (
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Điểm bài thi:</Text>
                <Text style={styles.scoreValue}>{submission?.score}%</Text>
              </View>
            )}

            {!!submission?.started_at && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Bắt đầu lúc:</Text>
                <Text style={styles.metaValue}>{formatDateTime(submission.started_at)}</Text>
              </View>
            )}

            {!!submission?.submitted_at && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Nộp lúc:</Text>
                <Text style={styles.metaValue}>{formatDateTime(submission.submitted_at)}</Text>
              </View>
            )}
          </View>
        )}

        {/* 4. Khối Bộ học liên kết */}
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

        {/* 5. Nút hành động dành cho Học sinh */}
        {!isTeacher && (
          <View style={styles.actionContainer}>
            {studentStatus === 'COMPLETED' ? (
              assignment.mode === 'TEST' && submission?.result_id ? (
                <TouchableOpacity
                  style={[styles.startActionBtn, { backgroundColor: '#4255FF' }]}
                  onPress={handleViewTestResult}
                  activeOpacity={0.85}>
                  <Text style={styles.startActionBtnIcon}>📊</Text>
                  <Text style={styles.startActionBtnText}>Xem kết quả bài kiểm tra</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.completedNotice}>
                  <Text style={styles.completedNoticeIcon}>✓</Text>
                  <Text style={styles.completedNoticeText}>
                    Bạn đã hoàn thành bài tập này!
                  </Text>
                </View>
              )
            ) : studentStatus === 'IN_PROGRESS' ? (
              <TouchableOpacity
                style={[styles.startActionBtn, { backgroundColor: modeInfo.color }]}
                onPress={handleContinueAssignment}
                activeOpacity={0.85}>
                <Text style={styles.startActionBtnIcon}>▶️</Text>
                <Text style={styles.startActionBtnText}>Tiếp tục làm bài</Text>
              </TouchableOpacity>
            ) : studentStatus === 'OVERDUE' ? (
              <View style={styles.overdueNotice}>
                <Text style={styles.overdueNoticeText}>
                  ⚠️ Bài tập này đã hết hạn. Bạn không thể nộp bài được nữa.
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.startActionBtn,
                  { backgroundColor: modeInfo.color },
                  starting && styles.btnDisabled,
                ]}
                onPress={handleStartAssignment}
                disabled={starting}
                activeOpacity={0.85}>
                {starting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.startActionBtnIcon}>{modeInfo.icon}</Text>
                    <Text style={styles.startActionBtnText}>Bắt đầu làm bài</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 6. Nút dành cho Giáo viên */}
        {isTeacher && (
          <View style={styles.teacherActionContainer}>
            <TouchableOpacity
              style={styles.gradebookActionBtn}
              onPress={() =>
                router.push({
                  pathname: `/class/[id]/assignment/[assignmentId]/gradebook` as any,
                  params: {
                    id: String(assignment.class_id),
                    assignmentId: String(assignment.assignment_id),
                  },
                })
              }
              activeOpacity={0.85}>
              <Text style={styles.gradebookActionBtnIcon}>📊</Text>
              <Text style={styles.gradebookActionBtnText}>Xem Bảng điểm lớp học</Text>
            </TouchableOpacity>

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
          </View>
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
    paddingBottom: 40,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
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
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  modeBadgeIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  modeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deadlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deadlineBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deadlineActive: {
    backgroundColor: '#EEF2FF',
  },
  deadlineActiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4255FF',
  },
  deadlineExpired: {
    backgroundColor: '#FEE2E2',
  },
  deadlineExpiredText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  deadlineNone: {
    backgroundColor: '#F3F4F6',
  },
  deadlineNoneText: {
    fontSize: 12,
    color: '#6B7280',
  },
  assignmentTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2E3856',
    lineHeight: 28,
    marginBottom: 8,
  },
  assignmentDescription: {
    fontSize: 14,
    color: '#586380',
    lineHeight: 20,
    marginBottom: 16,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  deadlineTitleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#586380',
    marginRight: 6,
  },
  deadlineValueText: {
    fontSize: 13,
    fontWeight: '700',
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
    fontWeight: '600',
    color: '#2E3856',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    marginBottom: 16,
  },
  statusCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#939BB4',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusPillIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803D',
    marginRight: 8,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803D',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metaLabel: {
    fontSize: 13,
    color: '#939BB4',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E3856',
  },
  studySetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#939BB4',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  studySetLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4255FF',
  },
  studySetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  setCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  setCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  setCardIconEmoji: {
    fontSize: 22,
  },
  setCardInfo: {
    flex: 1,
  },
  studySetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 4,
  },
  cardCountText: {
    fontSize: 12,
    color: '#939BB4',
    fontWeight: '500',
  },
  setArrow: {
    fontSize: 22,
    color: '#CBD5E1',
    fontWeight: '700',
    marginLeft: 8,
  },
  studySetDesc: {
    fontSize: 13,
    color: '#586380',
    marginTop: 10,
    lineHeight: 18,
  },
  actionContainer: {
    marginBottom: 16,
  },
  startActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  startActionBtnIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  startActionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  completedNoticeIcon: {
    fontSize: 18,
    color: '#059669',
    fontWeight: '800',
    marginRight: 8,
  },
  completedNoticeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
  },
  overdueNotice: {
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  overdueNoticeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B91C1C',
    textAlign: 'center',
  },
  teacherActionContainer: {
    gap: 12,
  },
  gradebookActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4255FF',
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  gradebookActionBtnIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  gradebookActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
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
    color: '#586380',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#586380',
    marginTop: 12,
  },
  primaryBtn: {
    backgroundColor: '#4255FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9DDE8',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 10,
  },
  secondaryBtnText: {
    color: '#2E3856',
    fontSize: 14,
    fontWeight: '600',
  },
  errorButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
