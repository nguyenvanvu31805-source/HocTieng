import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import { ClassDetail, ClassMember } from '@/types/class';
import {
  Assignment,
  AssignmentMode,
  AssignmentSubmission,
  AssignmentSubmissionStatus,
} from '@/types/assignment';
import { StudySet } from '@/types/studySet';
import classService from '@/services/classService';
import assignmentService from '@/services/assignmentService';
import api from '@/services/api';

const MODE_MAP: Record<
  AssignmentMode,
  { label: string; icon: string; color: string; bg: string; actionText: string; routeSuffix: string }
> = {
  TEST: {
    label: 'Luyện tập (Test)',
    icon: '✍️',
    color: '#4255FF',
    bg: '#EEF2FF',
    actionText: 'Làm bài ngay →',
    routeSuffix: 'test',
  },
  FLASHCARDS: {
    label: 'Học Flashcards',
    icon: '🗂️',
    color: '#10B981',
    bg: '#ECFDF5',
    actionText: 'Học ngay →',
    routeSuffix: 'flashcards',
  },
  MATCH: {
    label: 'Ghép thẻ (Match)',
    icon: '🎮',
    color: '#6366F1',
    bg: '#EEF2FF',
    actionText: 'Chơi ngay →',
    routeSuffix: 'match',
  },
  LEARN: {
    label: 'Học thẻ',
    icon: '🧠',
    color: '#F59E0B',
    bg: '#FEF3C7',
    actionText: 'Học ngay →',
    routeSuffix: 'learn',
  },
  ALL: {
    label: 'Tất cả chế độ',
    icon: '🌟',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    actionText: 'Học ngay →',
    routeSuffix: 'flashcards',
  },
};

const STATUS_BADGE_CONFIG: Record<
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

type TabType = 'assignments' | 'members';

export default function ClassDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();

  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<number, AssignmentSubmission>>({});
  const [startingId, setStartingId] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>('assignments');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [leaving, setLeaving] = useState(false);

  // Modal Giao bài tập (dành cho Giáo viên)
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDescription, setAssignDescription] = useState('');
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [selectedMode, setSelectedMode] = useState<AssignmentMode>('TEST');
  const [deadlinePreset, setDeadlinePreset] = useState<'none' | '1d' | '3d' | '7d'>('none');
  const [teacherSets, setTeacherSets] = useState<StudySet[]>([]);
  const [setsLoading, setSetsLoading] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Modal Sửa thông tin lớp học (dành cho Giáo viên chủ lớp)
  const [editClassModalVisible, setEditClassModalVisible] = useState(false);
  const [editClassName, setEditClassName] = useState('');
  const [editClassDescription, setEditClassDescription] = useState('');
  const [editClassSubmitting, setEditClassSubmitting] = useState(false);
  const [editClassError, setEditClassError] = useState('');
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

  // Tải chi tiết lớp, thành viên và bài tập
  const fetchClassData = useCallback(
    async (isRefresh = false) => {
      if (!id) return;
      if (!isRefresh) setLoading(true);
      setErrorMessage('');

      try {
        const [detailData, membersData, assignmentsData] = await Promise.all([
          classService.getClassDetail(id),
          classService.getClassMembers(id).catch(() => []),
          assignmentService.getClassAssignments(id).catch(() => []),
        ]);

        setClassDetail(detailData);
        setMembers(membersData);
        setAssignments(assignmentsData);

        const isTeacherUser =
          detailData?.is_teacher ||
          user?.role === 'TEACHER' ||
          user?.role === 'ADMIN' ||
          detailData?.member_role === 'TEACHER';

        if (!isTeacherUser && assignmentsData.length > 0) {
          try {
            const subResults = await Promise.all(
              assignmentsData.map((a) =>
                assignmentService.getMySubmission(a.assignment_id).catch(() => null),
              ),
            );
            const subMap: Record<number, AssignmentSubmission> = {};
            assignmentsData.forEach((a, idx) => {
              if (subResults[idx]) {
                subMap[a.assignment_id] = subResults[idx];
              }
            });
            setSubmissions(subMap);
          } catch {
            // ignore
          }
        }
      } catch (error: any) {
        const msg =
          error?.status === 404
            ? 'Không tìm thấy lớp học hoặc lớp đã bị xóa.'
            : error?.status === 403
              ? 'Bạn không có quyền truy cập lớp học này. Vui lòng tham gia lớp trước.'
              : error?.data?.message ||
                error?.message ||
                'Không thể tải thông tin lớp học. Vui lòng thử lại.';
        setErrorMessage(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, user?.role],
  );

  useEffect(() => {
    fetchClassData();
  }, [fetchClassData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchClassData(true);
  };

  // Xác nhận và xử lý rời lớp học
  const handleLeaveClass = () => {
    if (!id || leaving) return;

    Alert.alert(
      'Rời lớp học',
      `Bạn có chắc chắn muốn rời khỏi lớp "${classDetail?.name}" không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rời lớp',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              const res = await classService.leaveClass(id);
              Alert.alert('Thành công', res.message, [
                {
                  text: 'Đồng ý',
                  onPress: () => router.replace('/classes' as any),
                },
              ]);
            } catch (error: any) {
              const msg =
                error?.data?.message ||
                error?.message ||
                'Không thể rời lớp học. Vui lòng thử lại.';
              Alert.alert('Lỗi', msg);
            } finally {
              setLeaving(false);
            }
          },
        },
      ],
    );
  };

  const isTeacher =
    classDetail?.is_teacher ||
    user?.role === 'TEACHER' ||
    user?.role === 'ADMIN' ||
    classDetail?.member_role === 'TEACHER';

  const isTeacherOwner =
    Boolean(classDetail?.is_teacher) ||
    (Boolean(classDetail?.teacher_id && user?.user_id) &&
      Number(classDetail?.teacher_id) === Number(user?.user_id)) ||
    user?.role === 'ADMIN';

  // Mở modal sửa thông tin lớp
  const handleOpenEditClassModal = () => {
    if (!classDetail) return;
    setEditClassName(classDetail.name);
    setEditClassDescription(classDetail.description || '');
    setEditClassError('');
    setEditClassModalVisible(true);
  };

  // Gửi cập nhật thông tin lớp
  const handleEditClassSubmit = async () => {
    if (!id) return;
    const trimmedName = editClassName.trim();
    if (!trimmedName) {
      setEditClassError('Vui lòng nhập tên lớp học.');
      return;
    }

    setEditClassSubmitting(true);
    setEditClassError('');

    try {
      const updated = await classService.updateClass(id, {
        name: trimmedName,
        description: editClassDescription.trim() || null,
      });

      setClassDetail((prev) =>
        prev
          ? {
              ...prev,
              name: updated.name,
              description: updated.description,
            }
          : prev,
      );
      setEditClassModalVisible(false);
      Alert.alert('Thành công', 'Cập nhật thông tin lớp học thành công!');
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Không thể cập nhật lớp học.';
      setEditClassError(msg);
    } finally {
      setEditClassSubmitting(false);
    }
  };

  // Xóa học sinh khỏi lớp (dành cho Giáo viên chủ lớp)
  const handleRemoveMember = (member: ClassMember) => {
    if (!id) return;
    const memberName = member.full_name || member.username || `học viên #${member.user_id}`;
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc muốn xóa học viên này khỏi lớp?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setRemovingMemberId(member.user_id);
            try {
              await classService.removeMember(id, member.user_id);
              setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
              setClassDetail((prev) =>
                prev
                  ? {
                      ...prev,
                      member_count: Math.max(0, (prev.member_count || 1) - 1),
                    }
                  : prev,
              );
              Alert.alert('Thành công', `Đã xóa ${memberName} khỏi lớp.`);
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể xóa học viên khỏi lớp.');
            } finally {
              setRemovingMemberId(null);
            }
          },
        },
      ],
    );
  };

  const teacherName =
    classDetail?.teacher_full_name ||
    classDetail?.teacher_username ||
    `Giáo viên #${classDetail?.teacher_id}`;
  const initialLetter = (teacherName[0] || 'T').toUpperCase();

  // Mở modal tạo bài tập và tải danh sách bộ học của giáo viên
  const handleOpenAssignModal = async () => {
    setAssignTitle('');
    setAssignDescription('');
    setSelectedSetId(null);
    setSelectedMode('TEST');
    setDeadlinePreset('none');
    setAssignError('');
    setAssignModalVisible(true);

    setSetsLoading(true);
    try {
      // Ưu tiên tải bộ học của tôi trước, nếu rỗng thì tải bộ học công khai
      let res = await api.get<StudySet[]>('/study-sets/my');
      let sets = res.success && Array.isArray(res.data) ? res.data : [];

      if (sets.length === 0) {
        res = await api.get<StudySet[]>('/study-sets');
        sets = res.success && Array.isArray(res.data) ? res.data : [];
      }

      setTeacherSets(sets);
      if (sets.length > 0) {
        setSelectedSetId(sets[0].set_id);
      }
    } catch {
      setTeacherSets([]);
    } finally {
      setSetsLoading(false);
    }
  };

  // Xử lý gửi form tạo bài tập
  const handleCreateAssignmentSubmit = async () => {
    if (!id) return;
    const trimmedTitle = assignTitle.trim();
    if (!trimmedTitle) {
      setAssignError('Vui lòng nhập tiêu đề bài tập.');
      return;
    }
    if (!selectedSetId) {
      setAssignError('Vui lòng chọn một bộ từ vựng để giao bài.');
      return;
    }

    setAssignSubmitting(true);
    setAssignError('');

    try {
      let deadline: string | null = null;
      if (deadlinePreset !== 'none') {
        const now = new Date();
        const days = deadlinePreset === '1d' ? 1 : deadlinePreset === '3d' ? 3 : 7;
        now.setDate(now.getDate() + days);
        deadline = now.toISOString();
      }

      await assignmentService.createAssignment(id, {
        set_id: selectedSetId,
        title: trimmedTitle,
        description: assignDescription.trim() || undefined,
        mode: selectedMode,
        deadline,
      });

      setAssignModalVisible(false);
      fetchClassData(true);
      Alert.alert('Thành công', 'Đã giao bài tập mới cho lớp học!');
    } catch (error: any) {
      const msg =
        error?.data?.message ||
        error?.message ||
        'Không thể giao bài tập. Vui lòng thử lại.';
      setAssignError(msg);
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Header của toàn bộ màn hình
  const renderHeader = () => {
    if (!classDetail) return null;

    return (
      <View style={styles.headerContainer}>
        {/* Tên & Mô tả lớp học */}
        <View style={styles.titleCard}>
          <View style={styles.classIconBadge}>
            <Text style={styles.classIconBadgeEmoji}>🏫</Text>
          </View>
          <Text style={styles.className}>{classDetail.name}</Text>
          {!!classDetail.description && (
            <Text style={styles.classDescription}>{classDetail.description}</Text>
          )}

          {/* Thẻ giáo viên */}
          <View style={styles.teacherCard}>
            <View style={styles.teacherAvatar}>
              <Text style={styles.teacherAvatarText}>{initialLetter}</Text>
            </View>
            <View style={styles.teacherInfo}>
              <Text style={styles.teacherRoleLabel}>Giáo viên phụ trách</Text>
              <Text style={styles.teacherFullName}>{teacherName}</Text>
            </View>
            {classDetail.is_teacher && (
              <View style={styles.ownerBadge}>
                <Text style={styles.ownerBadgeText}>Lớp của bạn</Text>
              </View>
            )}
          </View>

          {isTeacherOwner && (
            <TouchableOpacity
              style={styles.editClassBtn}
              onPress={handleOpenEditClassModal}
              activeOpacity={0.8}>
              <Text style={styles.editClassBtnText}>✏️ Chỉnh sửa lớp</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Khối Mã tham gia (Join Code) */}
        {!!classDetail.join_code && (
          <View style={styles.codeCard}>
            <View style={styles.codeCardLeft}>
              <Text style={styles.codeLabel}>MÃ THAM GIA LỚP</Text>
              <Text style={styles.codeValue}>{classDetail.join_code}</Text>
              <Text style={styles.codeHint}>
                Chia sẻ mã này cho học viên khác để cùng tham gia lớp
              </Text>
            </View>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => {
                Alert.alert('Mã lớp học', `Mã tham gia của lớp là: ${classDetail.join_code}`);
              }}
              activeOpacity={0.8}>
              <Text style={styles.copyBtnText}>Xem mã</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bảng thống kê ngắn gọn */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statBox, activeTab === 'assignments' && styles.statBoxActive]}
            onPress={() => setActiveTab('assignments')}>
            <Text
              style={[
                styles.statNumber,
                activeTab === 'assignments' && styles.statNumberActive,
              ]}>
              {assignments.length}
            </Text>
            <Text
              style={[
                styles.statLabel,
                activeTab === 'assignments' && styles.statLabelActive,
              ]}>
              📚 Bài tập
            </Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={[styles.statBox, activeTab === 'members' && styles.statBoxActive]}
            onPress={() => setActiveTab('members')}>
            <Text
              style={[
                styles.statNumber,
                activeTab === 'members' && styles.statNumberActive,
              ]}>
              {members.length || classDetail.member_count || 1}
            </Text>
            <Text
              style={[
                styles.statLabel,
                activeTab === 'members' && styles.statLabelActive,
              ]}>
              👥 Thành viên
            </Text>
          </TouchableOpacity>
        </View>

        {/* Thanh chuyển đổi Tab (Bài tập / Thành viên) */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'assignments' && styles.tabButtonActive]}
            onPress={() => setActiveTab('assignments')}
            activeOpacity={0.8}>
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'assignments' && styles.tabButtonTextActive,
              ]}>
              📚 Bài tập ({assignments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'members' && styles.tabButtonActive]}
            onPress={() => setActiveTab('members')}
            activeOpacity={0.8}>
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'members' && styles.tabButtonTextActive,
              ]}>
              👥 Thành viên ({members.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Nút "+ Giao bài tập" dành riêng cho Giáo viên khi ở Tab Bài tập */}
        {activeTab === 'assignments' && isTeacher && (
          <TouchableOpacity
            style={styles.addAssignmentBtn}
            onPress={handleOpenAssignModal}
            activeOpacity={0.85}>
            <Text style={styles.addAssignmentBtnIcon}>➕</Text>
            <Text style={styles.addAssignmentBtnText}>Giao bài tập mới</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const handleStartAssignment = async (item: Assignment) => {
    if (startingId) return;
    const modeInfo = MODE_MAP[item.mode] || MODE_MAP.TEST;
    setStartingId(item.assignment_id);
    try {
      const res = await assignmentService.startAssignment(item.assignment_id);
      setSubmissions((prev) => ({ ...prev, [item.assignment_id]: res }));
      router.push({
        pathname: `/study-set/[id]/${modeInfo.routeSuffix}` as any,
        params: {
          id: String(item.set_id),
          assignmentId: String(item.assignment_id),
          classId: String(id),
        },
      });
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể bắt đầu bài tập.');
    } finally {
      setStartingId(null);
    }
  };

  const handleContinueAssignment = (item: Assignment) => {
    const modeInfo = MODE_MAP[item.mode] || MODE_MAP.TEST;
    router.push({
      pathname: `/study-set/[id]/${modeInfo.routeSuffix}` as any,
      params: {
        id: String(item.set_id),
        assignmentId: String(item.assignment_id),
        classId: String(id),
      },
    });
  };

  // Render thẻ Bài tập
  const renderAssignmentItem = ({ item }: { item: Assignment }) => {
    const modeInfo = MODE_MAP[item.mode] || MODE_MAP.TEST;
    const deadlineInfo = formatDeadline(item.deadline);

    const sub = submissions[item.assignment_id];
    const isPastDeadline = !!deadlineInfo?.isPast;
    const studentStatus: AssignmentSubmissionStatus =
      sub?.status || (isPastDeadline ? 'OVERDUE' : 'NOT_STARTED');
    const statusBadge = STATUS_BADGE_CONFIG[studentStatus] || STATUS_BADGE_CONFIG.NOT_STARTED;
    const isStarting = startingId === item.assignment_id;

    return (
      <TouchableOpacity
        style={styles.assignmentCard}
        onPress={() => router.push(`/assignment/${item.assignment_id}` as any)}
        activeOpacity={0.85}>
        <View style={styles.assignmentHeaderRow}>
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

          {/* Huy hiệu trạng thái dành cho học sinh */}
          {!isTeacher && (
            <View
              style={[
                styles.studentStatusBadge,
                { backgroundColor: statusBadge.bg, borderColor: statusBadge.border },
              ]}>
              <Text style={styles.studentStatusBadgeIcon}>{statusBadge.icon}</Text>
              <Text style={[styles.studentStatusBadgeText, { color: statusBadge.color }]}>
                {statusBadge.label}
                {studentStatus === 'COMPLETED' && sub?.score !== null && sub?.score !== undefined
                  ? ` (${sub.score}%)`
                  : ''}
              </Text>
            </View>
          )}

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
                {deadlineInfo.isPast ? '⚠️ Đã hết hạn' : `⏰ Hạn: ${deadlineInfo.formatted}`}
              </Text>
            </View>
          ) : (
            <View style={[styles.deadlineBadge, styles.deadlineNone]}>
              <Text style={styles.deadlineNoneText}>Không giới hạn</Text>
            </View>
          )}
        </View>

        <Text style={styles.assignmentTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {!!item.description && (
          <Text style={styles.assignmentDesc} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.assignmentSetRow}>
          <View style={styles.setRowLeft}>
            <Text style={styles.setRowIcon}>📚</Text>
            <Text style={styles.setRowTitle} numberOfLines={1}>
              {item.study_set_title}
            </Text>
          </View>
          <Text style={styles.setRowCount}>{item.card_count} thẻ</Text>
        </View>

        <View style={styles.assignmentCardFooter}>
          {isTeacher ? (
            <View style={styles.teacherActionRow}>
              <TouchableOpacity
                style={[styles.quickStartBtn, styles.teacherDetailBtn]}
                onPress={() => router.push(`/assignment/${item.assignment_id}` as any)}
                activeOpacity={0.8}>
                <Text style={styles.teacherDetailBtnText}>Chi tiết</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickStartBtn, styles.gradebookBtn]}
                onPress={() =>
                  router.push({
                    pathname: `/class/[id]/assignment/[assignmentId]/gradebook` as any,
                    params: {
                      id: String(id),
                      assignmentId: String(item.assignment_id),
                    },
                  })
                }
                activeOpacity={0.8}>
                <Text style={styles.gradebookBtnText}>📊 Bảng điểm</Text>
              </TouchableOpacity>
            </View>
          ) : studentStatus === 'COMPLETED' ? (
            <View style={styles.completedActionRow}>
              {item.mode === 'TEST' && (sub?.result_id || sub?.test_result_id) ? (
                <TouchableOpacity
                  style={[styles.quickStartBtn, { backgroundColor: '#10B981' }]}
                  onPress={() =>
                    router.push({
                      pathname: `/study-set/[id]/test` as any,
                      params: {
                        id: String(item.set_id),
                        assignmentId: String(item.assignment_id),
                        classId: String(id),
                        reviewResultId: String(sub.result_id || sub.test_result_id),
                      },
                    })
                  }
                  activeOpacity={0.8}>
                  <Text style={styles.quickStartBtnText}>📊 Xem kết quả bài kiểm tra</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.quickStartBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => router.push(`/assignment/${item.assignment_id}` as any)}
                  activeOpacity={0.8}>
                  <Text style={styles.quickStartBtnText}>✓ Đã hoàn thành (Xem lại)</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : studentStatus === 'OVERDUE' ? (
            <TouchableOpacity
              style={[styles.quickStartBtn, styles.disabledBtn]}
              disabled
              activeOpacity={0.8}>
              <Text style={styles.disabledBtnText}>⚠️ Đã hết hạn nộp bài</Text>
            </TouchableOpacity>
          ) : studentStatus === 'IN_PROGRESS' ? (
            <TouchableOpacity
              style={[styles.quickStartBtn, { backgroundColor: '#D97706' }]}
              onPress={() => handleContinueAssignment(item)}
              activeOpacity={0.8}>
              <Text style={styles.quickStartBtnText}>Tiếp tục làm bài →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.quickStartBtn, { backgroundColor: modeInfo.color }]}
              onPress={() => handleStartAssignment(item)}
              disabled={isStarting}
              activeOpacity={0.8}>
              {isStarting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.quickStartBtnText}>Bắt đầu làm bài →</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render thẻ Thành viên
  const renderMemberItem = ({ item }: { item: ClassMember }) => {
    const isMemberTeacher = item.member_role === 'TEACHER';
    const memberName = item.full_name || item.username || `Thành viên #${item.user_id}`;
    const memberLetter = (memberName[0] || 'U').toUpperCase();
    const canRemove = isTeacherOwner && !isMemberTeacher;

    return (
      <View style={styles.memberCard}>
        <View
          style={[
            styles.memberAvatar,
            isMemberTeacher && styles.memberAvatarTeacher,
          ]}>
          <Text style={styles.memberAvatarText}>{memberLetter}</Text>
        </View>

        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>
            {memberName}
          </Text>
          <Text style={styles.memberUsername}>@{item.username}</Text>
          {!!item.email && (
            <Text style={styles.memberEmail} numberOfLines={1}>
              ✉️ {item.email}
            </Text>
          )}
        </View>

        <View style={styles.memberRight}>
          <View
            style={[
              styles.roleBadge,
              isMemberTeacher ? styles.roleTeacherBadge : styles.roleStudentBadge,
            ]}>
            <Text
              style={[
                styles.roleBadgeText,
                isMemberTeacher
                  ? styles.roleTeacherBadgeText
                  : styles.roleStudentBadgeText,
              ]}>
              {isMemberTeacher ? 'Giáo viên' : 'Học sinh'}
            </Text>
          </View>

          {canRemove && (
            <TouchableOpacity
              style={styles.removeMemberBtn}
              onPress={() => handleRemoveMember(item)}
              disabled={removingMemberId === item.user_id}
              activeOpacity={0.7}>
              {removingMemberId === item.user_id ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={styles.removeMemberBtnText}>Xóa khỏi lớp</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Render khi rỗng (Empty State)
  const renderEmptyComponent = () => {
    if (activeTab === 'assignments') {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={styles.emptyTitle}>Lớp chưa có bài tập nào</Text>
          <Text style={styles.emptySubtitle}>
            {isTeacher
              ? 'Bấm nút "Giao bài tập mới" để giao bài ôn tập Flashcard, Test hoặc Ghép thẻ cho học sinh.'
              : 'Giáo viên sẽ giao bài tập sớm. Hãy quay lại sau!'}
          </Text>
          {isTeacher && (
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={handleOpenAssignModal}
              activeOpacity={0.85}>
              <Text style={styles.emptyActionBtnText}>+ Giao bài ngay</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyEmoji}>👥</Text>
        <Text style={styles.emptyTitle}>Chưa có thành viên</Text>
        <Text style={styles.emptySubtitle}>
          Hãy chia sẻ mã tham gia {classDetail?.join_code} để học viên tham gia vào lớp.
        </Text>
      </View>
    );
  };

  // Footer: Nút rời lớp học nếu là học sinh và ở tab Thành viên
  const renderFooter = () => {
    if (!classDetail || isTeacher || !classDetail.is_member || activeTab !== 'members') {
      return null;
    }

    return (
      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={styles.leaveClassBtn}
          onPress={handleLeaveClass}
          disabled={leaving}
          activeOpacity={0.8}>
          {leaving ? (
            <ActivityIndicator size="small" color="#D93025" />
          ) : (
            <>
              <Text style={styles.leaveClassBtnIcon}>🚪</Text>
              <Text style={styles.leaveClassBtnText}>Rời khỏi lớp học</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. TopBar Navigation */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnArrow}>←</Text>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {classDetail?.name || 'Chi tiết lớp học'}
        </Text>
        <View style={{ width: 70 }} />
      </View>

      {/* 2. Trạng thái Loading / Lỗi / Dữ liệu */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4255FF" />
          <Text style={styles.loadingText}>Đang tải thông tin lớp học...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerBox}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>Không thể tải lớp học</Text>
          <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          <View style={styles.errorButtonsRow}>
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={() => router.back()}>
              <Text style={styles.secondaryActionText}>Quay lại</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => fetchClassData()}>
              <Text style={styles.primaryActionText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={(activeTab === 'assignments' ? (assignments as any[]) : (members as any[]))}
          keyExtractor={(item: any) =>
            activeTab === 'assignments'
              ? `assign-${item.assignment_id}`
              : `member-${item.user_id}`
          }
          renderItem={(info) =>
            activeTab === 'assignments'
              ? renderAssignmentItem(info as { item: Assignment })
              : renderMemberItem(info as { item: ClassMember })
          }
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyComponent}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#4255FF']}
              tintColor="#4255FF"
            />
          }
        />
      )}

      {/* 3. Modal: Giao bài tập mới (Giáo viên / Admin) */}
      {isTeacher && (
        <Modal
          visible={assignModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!assignSubmitting) {
              setAssignModalVisible(false);
              setAssignError('');
            }
          }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Giao bài tập mới</Text>
                <Text style={styles.modalSubtitle}>
                  Tạo bài tập kèm hạn nộp và chế độ học cho lớp "{classDetail?.name}".
                </Text>
              </View>

              {!!assignError && (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.modalErrorText}>{assignError}</Text>
                </View>
              )}

              <ScrollView
                style={{ maxHeight: 380 }}
                showsVerticalScrollIndicator={false}>
                {/* Tiêu đề */}
                <Text style={styles.fieldLabel}>Tiêu đề bài tập *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ví dụ: Ôn tập từ vựng Tuần 1"
                  placeholderTextColor="#939BB4"
                  value={assignTitle}
                  onChangeText={setAssignTitle}
                  editable={!assignSubmitting}
                />

                {/* Mô tả */}
                <Text style={styles.fieldLabel}>Mô tả / Hướng dẫn (tùy chọn)</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalInputArea]}
                  placeholder="Ví dụ: Đạt tối thiểu 80% điểm để hoàn thành..."
                  placeholderTextColor="#939BB4"
                  value={assignDescription}
                  onChangeText={setAssignDescription}
                  multiline
                  numberOfLines={2}
                  editable={!assignSubmitting}
                />

                {/* Chọn Bộ học */}
                <Text style={styles.fieldLabel}>Chọn bộ từ vựng *</Text>
                {setsLoading ? (
                  <ActivityIndicator size="small" color="#4255FF" style={{ marginVertical: 8 }} />
                ) : teacherSets.length === 0 ? (
                  <Text style={styles.noSetsText}>
                    Không tìm thấy bộ học nào để giao. Hãy tạo bộ từ vựng trước.
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.setsScrollRow}>
                    {teacherSets.map((s) => {
                      const isSelected = selectedSetId === s.set_id;
                      return (
                        <TouchableOpacity
                          key={`set-${s.set_id}`}
                          style={[styles.setChip, isSelected && styles.setChipSelected]}
                          onPress={() => setSelectedSetId(s.set_id)}>
                          <Text
                            style={[
                              styles.setChipTitle,
                              isSelected && styles.setChipTitleSelected,
                            ]}
                            numberOfLines={1}>
                            {s.title}
                          </Text>
                          <Text
                            style={[
                              styles.setChipCount,
                              isSelected && styles.setChipCountSelected,
                            ]}>
                            {s.card_count || 0} thẻ
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Chọn Chế độ học */}
                <Text style={styles.fieldLabel}>Chế độ làm bài *</Text>
                <View style={styles.modePickerGrid}>
                  {(['TEST', 'FLASHCARDS', 'MATCH'] as AssignmentMode[]).map((m) => {
                    const info = MODE_MAP[m];
                    const isSelected = selectedMode === m;
                    return (
                      <TouchableOpacity
                        key={`mode-${m}`}
                        style={[
                          styles.modePickerBtn,
                          isSelected && {
                            borderColor: info.color,
                            backgroundColor: info.bg,
                          },
                        ]}
                        onPress={() => setSelectedMode(m)}>
                        <Text style={styles.modePickerIcon}>{info.icon}</Text>
                        <Text
                          style={[
                            styles.modePickerText,
                            isSelected && { color: info.color, fontWeight: '800' },
                          ]}>
                          {info.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Chọn Hạn nộp */}
                <Text style={styles.fieldLabel}>Hạn hoàn thành</Text>
                <View style={styles.presetRow}>
                  {[
                    { key: 'none', label: 'Không giới hạn' },
                    { key: '1d', label: '1 ngày' },
                    { key: '3d', label: '3 ngày' },
                    { key: '7d', label: '1 tuần' },
                  ].map((p) => {
                    const isSelected = deadlinePreset === p.key;
                    return (
                      <TouchableOpacity
                        key={p.key}
                        style={[
                          styles.presetChip,
                          isSelected && styles.presetChipSelected,
                        ]}
                        onPress={() => setDeadlinePreset(p.key as any)}>
                        <Text
                          style={[
                            styles.presetChipText,
                            isSelected && styles.presetChipTextSelected,
                          ]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Hàng nút Hủy / Giao bài */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setAssignModalVisible(false);
                    setAssignError('');
                  }}
                  disabled={assignSubmitting}>
                  <Text style={styles.modalCancelBtnText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSubmitBtn,
                    (!assignTitle.trim() || !selectedSetId || assignSubmitting) &&
                      styles.modalSubmitBtnDisabled,
                  ]}
                  onPress={handleCreateAssignmentSubmit}
                  disabled={!assignTitle.trim() || !selectedSetId || assignSubmitting}>
                  {assignSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Giao bài</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal: Sửa thông tin lớp học (Giáo viên chủ lớp) */}
      {isTeacherOwner && (
        <Modal
          visible={editClassModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!editClassSubmitting) {
              setEditClassModalVisible(false);
              setEditClassError('');
            }
          }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sửa thông tin lớp học</Text>
                <Text style={styles.modalSubtitle}>
                  Cập nhật tên và mô tả cho lớp học của bạn.
                </Text>
              </View>

              {!!editClassError && (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.modalErrorText}>{editClassError}</Text>
                </View>
              )}

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Tên lớp học *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Nhập tên lớp học..."
                  placeholderTextColor="#939BB4"
                  value={editClassName}
                  onChangeText={(val) => {
                    setEditClassName(val);
                    if (editClassError) setEditClassError('');
                  }}
                  editable={!editClassSubmitting}
                />

                <Text style={styles.fieldLabel}>Mô tả lớp học</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalInputArea]}
                  placeholder="Nhập mô tả lớp học (tùy chọn)..."
                  placeholderTextColor="#939BB4"
                  value={editClassDescription}
                  onChangeText={setEditClassDescription}
                  multiline
                  numberOfLines={3}
                  editable={!editClassSubmitting}
                />
              </ScrollView>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setEditClassModalVisible(false);
                    setEditClassError('');
                  }}
                  disabled={editClassSubmitting}>
                  <Text style={styles.modalCancelBtnText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSubmitBtn,
                    (!editClassName.trim() || editClassSubmitting) && styles.modalSubmitBtnDisabled,
                  ]}
                  onPress={handleEditClassSubmit}
                  disabled={!editClassName.trim() || editClassSubmitting}>
                  {editClassSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Lưu thay đổi</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
  },
  headerContainer: {
    marginBottom: 8,
  },
  titleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  classIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  classIconBadgeEmoji: {
    fontSize: 24,
  },
  className: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 8,
    lineHeight: 28,
  },
  classDescription: {
    fontSize: 14,
    color: '#60646C',
    lineHeight: 20,
    marginBottom: 16,
  },
  teacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7FB',
    borderRadius: 12,
    padding: 12,
  },
  teacherAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4255FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  teacherAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherRoleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#939BB4',
    textTransform: 'uppercase',
  },
  teacherFullName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E3856',
  },
  ownerBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ownerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4255FF',
  },
  editClassBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  editClassBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    marginBottom: 14,
  },
  codeCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  codeValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2E3856',
    letterSpacing: 3,
    marginBottom: 4,
  },
  codeHint: {
    fontSize: 12,
    color: '#60646C',
    lineHeight: 16,
  },
  copyBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginBottom: 14,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  statBoxActive: {
    backgroundColor: '#EEF2FF',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E8ECF4',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 2,
  },
  statNumberActive: {
    color: '#4255FF',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#60646C',
  },
  statLabelActive: {
    color: '#4255FF',
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E8ECF4',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#60646C',
  },
  tabButtonTextActive: {
    color: '#4255FF',
    fontWeight: '800',
  },
  addAssignmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4255FF',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 14,
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addAssignmentBtnIcon: {
    fontSize: 14,
    color: '#FFFFFF',
    marginRight: 6,
  },
  addAssignmentBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginBottom: 12,
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  assignmentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  studentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  studentStatusBadgeIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  studentStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  disabledBtn: {
    backgroundColor: '#E2E8F0',
  },
  disabledBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  completedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  modeBadgeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  deadlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deadlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deadlineActive: {
    backgroundColor: '#ECFDF5',
  },
  deadlineActiveText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  deadlineExpired: {
    backgroundColor: '#FEF2F2',
  },
  deadlineExpiredText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  deadlineNone: {
    backgroundColor: '#F6F7FB',
  },
  deadlineNoneText: {
    color: '#60646C',
    fontSize: 11,
    fontWeight: '600',
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 6,
  },
  assignmentDesc: {
    fontSize: 13,
    color: '#60646C',
    lineHeight: 18,
    marginBottom: 10,
  },
  assignmentSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F6F7FB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  setRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  setRowIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  setRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E3856',
    flex: 1,
  },
  setRowCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#939BB4',
  },
  assignmentCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  teacherActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teacherDetailBtn: {
    backgroundColor: '#F0F2F7',
  },
  teacherDetailBtnText: {
    color: '#2E3856',
    fontSize: 13,
    fontWeight: '700',
  },
  gradebookBtn: {
    backgroundColor: '#4255FF',
  },
  gradebookBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  quickStartBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickStartBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    marginBottom: 8,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#939BB4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  memberAvatarTeacher: {
    backgroundColor: '#10B981',
  },
  memberAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 1,
  },
  memberUsername: {
    fontSize: 12,
    color: '#939BB4',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleTeacherBadge: {
    backgroundColor: '#ECFDF5',
  },
  roleStudentBadge: {
    backgroundColor: '#EEF2FF',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roleTeacherBadgeText: {
    color: '#059669',
  },
  roleStudentBadgeText: {
    color: '#4F46E5',
  },
  memberEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  memberRight: {
    alignItems: 'flex-end',
    gap: 6,
    marginLeft: 8,
  },
  removeMemberBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  removeMemberBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginVertical: 12,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyActionBtn: {
    backgroundColor: '#4255FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footerContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  leaveClassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  leaveClassBtnIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  leaveClassBtnText: {
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
  secondaryActionButton: {
    backgroundColor: '#E8ECF4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  secondaryActionText: {
    color: '#2E3856',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryActionButton: {
    backgroundColor: '#4255FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#60646C',
    lineHeight: 18,
  },
  modalErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalErrorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    height: 46,
    backgroundColor: '#F6F7FB',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#2E3856',
  },
  modalInputArea: {
    height: 64,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  noSetsText: {
    fontSize: 13,
    color: '#DC2626',
    marginBottom: 8,
  },
  setsScrollRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  setChip: {
    backgroundColor: '#F6F7FB',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginRight: 8,
    minWidth: 120,
  },
  setChipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4255FF',
  },
  setChipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 2,
  },
  setChipTitleSelected: {
    color: '#4255FF',
  },
  setChipCount: {
    fontSize: 11,
    color: '#939BB4',
  },
  setChipCountSelected: {
    color: '#4255FF',
    fontWeight: '600',
  },
  modePickerGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  modePickerBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    backgroundColor: '#F6F7FB',
    alignItems: 'center',
  },
  modePickerIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  modePickerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#60646C',
    textAlign: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F6F7FB',
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  presetChipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4255FF',
  },
  presetChipText: {
    fontSize: 12,
    color: '#60646C',
    fontWeight: '600',
  },
  presetChipTextSelected: {
    color: '#4255FF',
    fontWeight: '700',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#E8ECF4',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E3856',
  },
  modalSubmitBtn: {
    flex: 1.5,
    backgroundColor: '#4255FF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#A0ABFF',
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
