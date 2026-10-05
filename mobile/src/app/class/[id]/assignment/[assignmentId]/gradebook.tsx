import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import {
  AssignmentMode,
  AssignmentSubmissionStatus,
  GradebookData,
  GradebookStudent,
} from '@/types/assignment';
import assignmentService from '@/services/assignmentService';

const MODE_CONFIG: Record<
  AssignmentMode,
  { label: string; icon: string; color: string; bg: string }
> = {
  TEST: { label: 'Luyện tập (Test)', icon: '✍️', color: '#4255FF', bg: '#EEF2FF' },
  FLASHCARDS: { label: 'Học Flashcards', icon: '🗂️', color: '#10B981', bg: '#ECFDF5' },
  MATCH: { label: 'Ghép thẻ (Match)', icon: '🎮', color: '#6366F1', bg: '#EEF2FF' },
  LEARN: { label: 'Học thẻ', icon: '🧠', color: '#F59E0B', bg: '#FEF3C7' },
  ALL: { label: 'Tất cả chế độ', icon: '🌟', color: '#8B5CF6', bg: '#F5F3FF' },
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

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDeadline(deadlineStr: string | null): { formatted: string; isPast: boolean } | null {
  if (!deadlineStr) return null;
  const d = new Date(deadlineStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const isPast = d.getTime() < now.getTime();
  const formatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { formatted, isPast };
}

type FilterStatusType = 'ALL' | AssignmentSubmissionStatus;

export default function TeacherGradebookScreen() {
  const router = useRouter();
  const { id, classId: paramClassId, assignmentId: paramAssignmentId } = useLocalSearchParams<{
    id?: string;
    classId?: string;
    assignmentId?: string;
  }>();

  const classId = paramClassId || id;
  const assignmentId = paramAssignmentId;

  const { user, isAuthenticated } = useAuth();

  const [gradebook, setGradebook] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Bộ lọc và tìm kiếm client-side
  const [statusFilter, setStatusFilter] = useState<FilterStatusType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchGradebook = useCallback(
    async (isRefresh = false) => {
      if (!classId || !assignmentId) {
        setErrorMessage('Thiếu thông tin lớp học hoặc bài tập.');
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage('');
      setUnauthorized(false);
      setNotFound(false);

      try {
        const data = await assignmentService.getGradebook(classId, assignmentId);
        setGradebook(data);
      } catch (error: any) {
        const status = error?.status || error?.response?.status;
        if (status === 403) {
          setUnauthorized(true);
          setErrorMessage('Bạn không có quyền xem bảng điểm này. Chỉ giáo viên sở hữu lớp mới có thể truy cập.');
        } else if (status === 404) {
          setNotFound(true);
          setErrorMessage('Không tìm thấy bài tập hoặc lớp học này.');
        } else {
          setErrorMessage(
            error?.data?.message ||
              error?.message ||
              'Không thể tải bảng điểm bài tập. Vui lòng thử lại.',
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [classId, assignmentId],
  );

  useEffect(() => {
    fetchGradebook();
  }, [fetchGradebook]);

  const handleRefresh = () => {
    fetchGradebook(true);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (classId) {
      router.replace(`/class/${classId}` as any);
    } else {
      router.back();
    }
  };

  // Danh sách học sinh sau khi áp dụng tìm kiếm và bộ lọc trạng thái
  const filteredStudents = useMemo(() => {
    if (!gradebook?.students) return [];
    let list = gradebook.students;

    if (statusFilter !== 'ALL') {
      list = list.filter((s) => s.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((s) => {
        const nameMatch = s.full_name?.toLowerCase().includes(q);
        const usernameMatch = s.username?.toLowerCase().includes(q);
        const emailMatch = s.email?.toLowerCase().includes(q);
        return Boolean(nameMatch || usernameMatch || emailMatch);
      });
    }

    return list;
  }, [gradebook?.students, statusFilter, searchQuery]);

  // Kiểm tra chế độ bài tập
  const mode = gradebook?.assignment?.mode || 'TEST';
  const modeInfo = MODE_CONFIG[mode] || MODE_CONFIG.TEST;
  const deadlineInfo = formatDeadline(gradebook?.assignment?.deadline || null);

  // Header của danh sách (Thông tin bài tập + Tổng quan thống kê + Thanh tìm kiếm + Tabs lọc)
  const renderListHeader = () => {
    if (!gradebook) return null;
    const summary = gradebook.summary;

    const filterCounts = {
      ALL: summary.total_students,
      COMPLETED: summary.completed_count,
      IN_PROGRESS: summary.in_progress_count,
      NOT_STARTED: summary.not_started_count,
      OVERDUE: summary.overdue_count,
    };

    return (
      <View style={styles.headerWrapper}>
        {/* 1. Thẻ thông tin bài tập */}
        <View style={styles.assignmentInfoCard}>
          <View style={styles.assignmentBadgeRow}>
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
                  {deadlineInfo.isPast ? '⚠️ Đã hết hạn' : `⏰ Hạn: ${deadlineInfo.formatted}`}
                </Text>
              </View>
            ) : (
              <View style={[styles.deadlineBadge, styles.deadlineNone]}>
                <Text style={styles.deadlineNoneText}>Không giới hạn hạn nộp</Text>
              </View>
            )}
          </View>

          <Text style={styles.assignmentTitleText}>{gradebook.assignment.title}</Text>

          <View style={styles.studySetRow}>
            <Text style={styles.studySetIcon}>📚</Text>
            <Text style={styles.studySetTitleText} numberOfLines={1}>
              {gradebook.assignment.study_set_title}
            </Text>
          </View>
        </View>

        {/* 2. Khối tổng quan chỉ số (Summary Cards) */}
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionHeaderTitle}>📊 Tổng quan kết quả</Text>

          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, styles.kpiCardTotal]}>
              <Text style={styles.kpiValue}>{summary.total_students}</Text>
              <Text style={styles.kpiLabel}>Tổng học sinh</Text>
            </View>

            <View style={[styles.kpiCard, styles.kpiCardRate]}>
              <Text style={[styles.kpiValue, { color: '#15803D' }]}>
                {summary.completion_rate}%
              </Text>
              <Text style={styles.kpiLabel}>Tỷ lệ hoàn thành</Text>
            </View>

            <View style={[styles.kpiCard, styles.kpiCardScore]}>
              <Text style={[styles.kpiValue, { color: '#4255FF' }]}>
                {mode === 'TEST'
                  ? summary.average_score !== null
                    ? `${summary.average_score}%`
                    : '-'
                  : '-'}
              </Text>
              <Text style={styles.kpiLabel}>
                {mode === 'TEST' ? 'Điểm trung bình' : 'Điểm (không áp dụng)'}
              </Text>
            </View>
          </View>

          {/* 4 Thống kê chi tiết trạng thái */}
          <View style={styles.statusBreakdownGrid}>
            <TouchableOpacity
              style={[
                styles.statusBreakdownItem,
                statusFilter === 'COMPLETED' && styles.statusBreakdownItemActive,
              ]}
              onPress={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
              activeOpacity={0.7}>
              <Text style={styles.breakdownIcon}>🟢</Text>
              <Text style={styles.breakdownValue}>{summary.completed_count}</Text>
              <Text style={styles.breakdownLabel}>Đã hoàn thành</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusBreakdownItem,
                statusFilter === 'IN_PROGRESS' && styles.statusBreakdownItemActive,
              ]}
              onPress={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
              activeOpacity={0.7}>
              <Text style={styles.breakdownIcon}>🟡</Text>
              <Text style={styles.breakdownValue}>{summary.in_progress_count}</Text>
              <Text style={styles.breakdownLabel}>Đang làm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusBreakdownItem,
                statusFilter === 'NOT_STARTED' && styles.statusBreakdownItemActive,
              ]}
              onPress={() => setStatusFilter(statusFilter === 'NOT_STARTED' ? 'ALL' : 'NOT_STARTED')}
              activeOpacity={0.7}>
              <Text style={styles.breakdownIcon}>⚪</Text>
              <Text style={styles.breakdownValue}>{summary.not_started_count}</Text>
              <Text style={styles.breakdownLabel}>Chưa làm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusBreakdownItem,
                statusFilter === 'OVERDUE' && styles.statusBreakdownItemActive,
              ]}
              onPress={() => setStatusFilter(statusFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
              activeOpacity={0.7}>
              <Text style={styles.breakdownIcon}>🔴</Text>
              <Text style={styles.breakdownValue}>{summary.overdue_count}</Text>
              <Text style={styles.breakdownLabel}>Quá hạn</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Thanh tìm kiếm */}
        <View style={styles.searchBarContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo họ tên hoặc username..."
            placeholderTextColor="#939BB4"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearSearchIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 4. Thanh Tabs lọc trạng thái */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContent}
          style={styles.filterTabsScroll}>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setStatusFilter('ALL')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.filterChipText,
                statusFilter === 'ALL' && styles.filterChipTextActive,
              ]}>
              Tất cả ({filterCounts.ALL})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'COMPLETED' && styles.filterChipActive]}
            onPress={() => setStatusFilter('COMPLETED')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.filterChipText,
                statusFilter === 'COMPLETED' && styles.filterChipTextActive,
              ]}>
              🟢 Đã hoàn thành ({filterCounts.COMPLETED})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'IN_PROGRESS' && styles.filterChipActive]}
            onPress={() => setStatusFilter('IN_PROGRESS')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.filterChipText,
                statusFilter === 'IN_PROGRESS' && styles.filterChipTextActive,
              ]}>
              🟡 Đang làm ({filterCounts.IN_PROGRESS})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'NOT_STARTED' && styles.filterChipActive]}
            onPress={() => setStatusFilter('NOT_STARTED')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.filterChipText,
                statusFilter === 'NOT_STARTED' && styles.filterChipTextActive,
              ]}>
              ⚪ Chưa làm ({filterCounts.NOT_STARTED})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'OVERDUE' && styles.filterChipActive]}
            onPress={() => setStatusFilter('OVERDUE')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.filterChipText,
                statusFilter === 'OVERDUE' && styles.filterChipTextActive,
              ]}>
              🔴 Quá hạn ({filterCounts.OVERDUE})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.listSectionHeader}>
          <Text style={styles.listSectionTitle}>
            Danh sách học sinh ({filteredStudents.length}/{summary.total_students})
          </Text>
        </View>
      </View>
    );
  };

  // Render từng thẻ học sinh
  const renderStudentItem = ({ item }: { item: GradebookStudent }) => {
    const studentName = item.full_name || item.username || `Học sinh #${item.user_id}`;
    const initialLetter = (studentName[0] || 'U').toUpperCase();
    const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.NOT_STARTED;

    return (
      <View style={styles.studentCard}>
        <View style={styles.studentCardHeader}>
          <View style={styles.studentAvatar}>
            <Text style={styles.studentAvatarText}>{initialLetter}</Text>
          </View>

          <View style={styles.studentMainInfo}>
            <Text style={styles.studentFullName} numberOfLines={1}>
              {studentName}
            </Text>
            <Text style={styles.studentUsername} numberOfLines={1}>
              @{item.username}
            </Text>
          </View>

          {/* Huy hiệu trạng thái */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusInfo.bg, borderColor: statusInfo.border },
            ]}>
            <Text style={styles.statusBadgeIcon}>{statusInfo.icon}</Text>
            <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Khối thông tin chi tiết: Điểm số & Mốc thời gian */}
        <View style={styles.studentMetaContainer}>
          {/* Điểm số đối với bài TEST */}
          <View style={styles.metaRow}>
            <Text style={styles.metaRowLabel}>Điểm bài làm:</Text>
            {mode === 'TEST' ? (
              item.status === 'COMPLETED' && item.score !== null ? (
                <View style={styles.scorePill}>
                  <Text
                    style={[
                      styles.scorePillText,
                      item.score >= 80
                        ? styles.scoreHigh
                        : item.score >= 50
                          ? styles.scoreMedium
                          : styles.scoreLow,
                    ]}>
                    {item.score}%
                  </Text>
                </View>
              ) : (
                <Text style={styles.metaRowValueMuted}>
                  {item.status === 'IN_PROGRESS'
                    ? 'Đang làm...'
                    : item.status === 'OVERDUE'
                      ? 'Chưa nộp (0%)'
                      : 'Chưa làm'}
                </Text>
              )
            ) : (
              <Text style={styles.metaRowValueMuted}>
                {item.status === 'COMPLETED' ? 'Đã hoàn thành' : '-'}
              </Text>
            )}
          </View>

          {/* Thời gian bắt đầu */}
          {!!item.started_at && (
            <View style={styles.metaRow}>
              <Text style={styles.metaRowLabel}>Bắt đầu làm:</Text>
              <Text style={styles.metaRowValue}>{formatDateTime(item.started_at)}</Text>
            </View>
          )}

          {/* Thời gian nộp bài */}
          {!!item.submitted_at && (
            <View style={styles.metaRow}>
              <Text style={styles.metaRowLabel}>Thời gian nộp:</Text>
              <Text style={styles.metaRowValue}>{formatDateTime(item.submitted_at)}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render khi rỗng
  const renderEmptyComponent = () => {
    if (!gradebook) return null;
    const isSearching = !!searchQuery.trim() || statusFilter !== 'ALL';

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>{isSearching ? '🔍' : '👥'}</Text>
        <Text style={styles.emptyTitle}>
          {isSearching ? 'Không tìm thấy học sinh' : 'Chưa có học sinh trong lớp'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {isSearching
            ? 'Không có học sinh nào phù hợp với bộ lọc hoặc từ khóa tìm kiếm.'
            : 'Lớp học hiện tại chưa có thành viên học sinh nào.'}
        </Text>
        {isSearching && (
          <TouchableOpacity
            style={styles.resetFilterBtn}
            onPress={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
            activeOpacity={0.8}>
            <Text style={styles.resetFilterBtnText}>Xóa bộ lọc & tìm kiếm</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Thanh TopBar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Text style={styles.backBtnArrow}>←</Text>
          <Text style={styles.backBtnText}>Lớp học</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          Bảng điểm bài tập
        </Text>
        <TouchableOpacity
          style={styles.refreshIconBtn}
          onPress={handleRefresh}
          disabled={refreshing}
          activeOpacity={0.7}>
          <Text style={styles.refreshIconText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Xử lý các trạng thái: Loading, Lỗi 403, 404, Lỗi mạng */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4255FF" />
          <Text style={styles.loadingText}>Đang tải bảng điểm...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerBox}>
          <Text style={styles.stateIcon}>{unauthorized ? '🔐' : notFound ? '🔍' : '⚠️'}</Text>
          <Text style={styles.stateTitle}>
            {unauthorized
              ? 'Không có quyền truy cập'
              : notFound
                ? 'Không tìm thấy'
                : 'Không thể tải bảng điểm'}
          </Text>
          <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          <View style={styles.errorButtonsRow}>
            <TouchableOpacity style={styles.secondaryActionButton} onPress={handleBack}>
              <Text style={styles.secondaryActionText}>Quay lại lớp học</Text>
            </TouchableOpacity>
            {!unauthorized && (
              <TouchableOpacity style={styles.primaryActionButton} onPress={() => fetchGradebook()}>
                <Text style={styles.primaryActionText}>Thử lại</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => `student-${item.user_id}`}
          renderItem={renderStudentItem}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyComponent}
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
    fontSize: 18,
    color: '#4255FF',
    fontWeight: '700',
    marginRight: 4,
  },
  backBtnText: {
    fontSize: 14,
    color: '#4255FF',
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2E3856',
    flex: 1,
    textAlign: 'center',
  },
  refreshIconBtn: {
    minWidth: 70,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  refreshIconText: {
    fontSize: 18,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#60646C',
    marginTop: 14,
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
  secondaryActionButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
  },
  secondaryActionText: {
    color: '#2E3856',
    fontSize: 14,
    fontWeight: '700',
  },
  listContainer: {
    paddingBottom: 40,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  assignmentInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginBottom: 14,
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  assignmentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
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
  },
  deadlineExpired: {
    backgroundColor: '#FEF2F2',
  },
  deadlineExpiredText: {
    color: '#DC2626',
  },
  deadlineNone: {
    backgroundColor: '#F6F7FB',
  },
  deadlineNoneText: {
    color: '#60646C',
    fontSize: 11,
    fontWeight: '600',
  },
  assignmentTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 10,
    lineHeight: 24,
  },
  studySetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7FB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  studySetIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  studySetTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E3856',
    flex: 1,
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  kpiCardTotal: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  kpiCardRate: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  kpiCardScore: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  statusBreakdownGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBreakdownItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  statusBreakdownItemActive: {
    borderColor: '#4255FF',
    backgroundColor: '#EEF2FF',
  },
  breakdownIcon: {
    fontSize: 12,
    marginBottom: 2,
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 1,
  },
  breakdownLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#2E3856',
    padding: 0,
  },
  clearSearchIcon: {
    fontSize: 14,
    color: '#939BB4',
    paddingHorizontal: 4,
  },
  filterTabsScroll: {
    marginBottom: 12,
  },
  filterTabsContent: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
  },
  filterChipActive: {
    backgroundColor: '#4255FF',
    borderColor: '#4255FF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60646C',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listSectionHeader: {
    marginBottom: 8,
  },
  listSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2E3856',
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  studentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  studentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4255FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  studentAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  studentMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  studentFullName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 2,
  },
  studentUsername: {
    fontSize: 12,
    color: '#939BB4',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  studentMetaContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRowLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  metaRowValue: {
    fontSize: 12,
    color: '#2E3856',
    fontWeight: '700',
  },
  metaRowValueMuted: {
    fontSize: 12,
    color: '#939BB4',
    fontWeight: '600',
  },
  scorePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scorePillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  scoreHigh: {
    color: '#15803D',
  },
  scoreMedium: {
    color: '#D97706',
  },
  scoreLow: {
    color: '#DC2626',
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
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
  resetFilterBtn: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  resetFilterBtnText: {
    color: '#4255FF',
    fontSize: 13,
    fontWeight: '700',
  },
});
