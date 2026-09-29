import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ClassItem } from '@/types/class';
import classService from '@/services/classService';

export default function ClassesScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modal Tham gia lớp học
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinNotice, setJoinNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null,
  );

  // Modal Tạo lớp học (Dành cho Teacher / Admin)
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  // Tải danh sách lớp học từ Backend
  const fetchClasses = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setErrorMessage('');

    try {
      const data = await classService.getMyClasses();
      setClasses(data);
    } catch (error: any) {
      const msg =
        error?.data?.message ||
        error?.message ||
        'Không thể tải danh sách lớp học. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Tự động làm mới khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchClasses();
      } else {
        setLoading(false);
      }
    }, [isAuthenticated, fetchClasses]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchClasses(true);
  };

  // Xử lý gửi mã tham gia lớp
  const handleJoinSubmit = async () => {
    const trimmedCode = joinCode.trim().toUpperCase();
    if (!trimmedCode) {
      setJoinNotice({ type: 'error', text: 'Vui lòng nhập mã tham gia lớp học.' });
      return;
    }

    setJoinLoading(true);
    setJoinNotice(null);

    try {
      const result = await classService.joinClass(trimmedCode);
      const successMsg = result.message || 'Tham gia lớp học thành công!';

      setJoinNotice({ type: 'success', text: successMsg });
      fetchClasses(true);

      // Đóng modal sau 1.2s và reset form
      setTimeout(() => {
        setJoinModalVisible(false);
        setJoinCode('');
        setJoinNotice(null);
        if (result.class_id) {
          router.push(`/class/${result.class_id}` as any);
        }
      }, 1200);
    } catch (error: any) {
      const msg =
        error?.status === 404
          ? 'Mã tham gia không tồn tại.'
          : error?.data?.message ||
            error?.message ||
            'Không thể tham gia lớp học. Vui lòng kiểm tra lại mã.';
      setJoinNotice({ type: 'error', text: msg });
    } finally {
      setJoinLoading(false);
    }
  };

  // Xử lý tạo lớp học mới
  const handleCreateSubmit = async () => {
    const trimmedName = createName.trim();
    if (!trimmedName) {
      setCreateError('Vui lòng nhập tên lớp học.');
      return;
    }

    setCreateLoading(true);
    setCreateError('');

    try {
      const created = await classService.createClass({
        name: trimmedName,
        description: createDescription.trim() || undefined,
      });

      setCreateModalVisible(false);
      setCreateName('');
      setCreateDescription('');
      fetchClasses(true);

      Alert.alert(
        'Tạo lớp thành công!',
        `Lớp "${created.name}" đã được tạo.\nMã tham gia: ${created.join_code}`,
        [
          {
            text: 'Vào xem lớp',
            onPress: () => router.push(`/class/${created.class_id}` as any),
          },
          { text: 'Đóng', style: 'cancel' },
        ],
      );
    } catch (error: any) {
      const msg =
        error?.data?.message || error?.message || 'Không thể tạo lớp học. Vui lòng thử lại.';
      setCreateError(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  // Render từng thẻ lớp học trong FlatList
  const renderClassItem = ({ item }: { item: ClassItem }) => {
    const teacherName =
      item.teacher_full_name || item.teacher_username || `Giáo viên #${item.teacher_id}`;
    const initialLetter = (teacherName[0] || 'T').toUpperCase();

    return (
      <TouchableOpacity
        style={styles.classCard}
        onPress={() => router.push(`/class/${item.class_id}` as any)}
        activeOpacity={0.85}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconBox}>
            <Text style={styles.iconBoxEmoji}>🏫</Text>
          </View>
          <View style={styles.cardHeaderTitleBox}>
            <Text style={styles.className} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.teacherRow}>
              <View style={styles.miniAvatar}>
                <Text style={styles.miniAvatarText}>{initialLetter}</Text>
              </View>
              <Text style={styles.teacherName} numberOfLines={1}>
                {teacherName}
              </Text>
            </View>
          </View>
          <Text style={styles.cardArrow}>›</Text>
        </View>

        {!!item.description && (
          <Text style={styles.classDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.cardFooterRow}>
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>👥 {item.member_count || 1} thành viên</Text>
          </View>

          {!!item.join_code && (
            <View style={[styles.metaBadge, styles.codeBadge]}>
              <Text style={styles.codeBadgeText}>Mã: {item.join_code}</Text>
            </View>
          )}

          {item.member_role === 'TEACHER' && (
            <View style={[styles.metaBadge, styles.teacherBadge]}>
              <Text style={styles.teacherBadgeText}>Giáo viên</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Nội dung khi người dùng chưa đăng nhập
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnArrow}>←</Text>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Lớp học</Text>
          <View style={{ width: 70 }} />
        </View>

        <View style={styles.centerBox}>
          <Text style={styles.stateIcon}>🔐</Text>
          <Text style={styles.stateTitle}>Yêu cầu đăng nhập</Text>
          <Text style={styles.stateSubtitle}>
            Vui lòng đăng nhập tài khoản để xem danh sách lớp học hoặc tham gia lớp học mới.
          </Text>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => router.push('/(auth)/login' as any)}>
            <Text style={styles.primaryActionText}>Đăng nhập ngay</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Thanh tiêu đề TopBar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnArrow}>←</Text>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Lớp học</Text>
        <TouchableOpacity
          style={styles.topBarJoinBtn}
          onPress={() => setJoinModalVisible(true)}>
          <Text style={styles.topBarJoinText}>+ Tham gia</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Banner thao tác nhanh & tạo lớp */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.joinClassBtn}
          onPress={() => setJoinModalVisible(true)}
          activeOpacity={0.85}>
          <Text style={styles.joinClassBtnIcon}>🔑</Text>
          <Text style={styles.joinClassBtnText}>+ Tham gia lớp bằng mã</Text>
        </TouchableOpacity>

        {isTeacher && (
          <TouchableOpacity
            style={styles.createClassBtn}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.85}>
            <Text style={styles.createClassBtnIcon}>➕</Text>
            <Text style={styles.createClassBtnText}>Tạo lớp mới</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Thân danh sách lớp học */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4255FF" />
          <Text style={styles.loadingText}>Đang tải danh sách lớp học...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerBox}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>Không thể tải danh sách</Text>
          <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => fetchClasses()}>
            <Text style={styles.primaryActionText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : classes.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.stateIcon}>🏫</Text>
          <Text style={styles.stateTitle}>Chưa tham gia lớp nào</Text>
          <Text style={styles.stateSubtitle}>
            Bạn chưa tham gia lớp học nào. Hãy nhấn nút bên dưới và nhập mã tham gia do giáo viên cung cấp để bắt đầu.
          </Text>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => setJoinModalVisible(true)}>
            <Text style={styles.primaryActionText}>+ Tham gia lớp ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => String(item.class_id)}
          renderItem={renderClassItem}
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

      {/* 4. Modal: Tham gia lớp học bằng mã */}
      <Modal
        visible={joinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!joinLoading) {
            setJoinModalVisible(false);
            setJoinNotice(null);
          }
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tham gia lớp học</Text>
              <Text style={styles.modalSubtitle}>
                Nhập mã tham gia gồm 6 ký tự do giáo viên hoặc bạn bè chia sẻ để tham gia lớp.
              </Text>
            </View>

            {/* Thông báo kết quả tham gia */}
            {joinNotice && (
              <View
                style={[
                  styles.noticeBox,
                  joinNotice.type === 'success'
                    ? styles.noticeSuccess
                    : styles.noticeError,
                ]}>
                <Text
                  style={[
                    styles.noticeText,
                    joinNotice.type === 'success'
                      ? styles.noticeTextSuccess
                      : styles.noticeTextError,
                  ]}>
                  {joinNotice.text}
                </Text>
              </View>
            )}

            <TextInput
              style={styles.codeInput}
              placeholder="Ví dụ: 7BQ5NE"
              placeholderTextColor="#939BB4"
              value={joinCode}
              onChangeText={(val) => {
                setJoinCode(val);
                if (joinNotice) setJoinNotice(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              editable={!joinLoading}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setJoinModalVisible(false);
                  setJoinCode('');
                  setJoinNotice(null);
                }}
                disabled={joinLoading}>
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  (!joinCode.trim() || joinLoading) && styles.modalSubmitBtnDisabled,
                ]}
                onPress={handleJoinSubmit}
                disabled={!joinCode.trim() || joinLoading}>
                {joinLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Tham gia</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. Modal: Tạo lớp học mới (Giáo viên / Admin) */}
      {isTeacher && (
        <Modal
          visible={createModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!createLoading) {
              setCreateModalVisible(false);
              setCreateError('');
            }
          }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Tạo lớp học mới</Text>
                <Text style={styles.modalSubtitle}>
                  Tạo không gian lớp học để mời học viên và chia sẻ bộ từ vựng.
                </Text>
              </View>

              {!!createError && (
                <View style={[styles.noticeBox, styles.noticeError]}>
                  <Text style={[styles.noticeText, styles.noticeTextError]}>
                    {createError}
                  </Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>Tên lớp học *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ví dụ: Lớp IELTS Intensive K42"
                placeholderTextColor="#939BB4"
                value={createName}
                onChangeText={setCreateName}
                editable={!createLoading}
              />

              <Text style={styles.fieldLabel}>Mô tả (tùy chọn)</Text>
              <TextInput
                style={[styles.formInput, styles.formInputArea]}
                placeholder="Mô tả mục tiêu hoặc lịch trình học của lớp..."
                placeholderTextColor="#939BB4"
                value={createDescription}
                onChangeText={setCreateDescription}
                multiline
                numberOfLines={3}
                editable={!createLoading}
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setCreateModalVisible(false);
                    setCreateError('');
                  }}
                  disabled={createLoading}>
                  <Text style={styles.modalCancelBtnText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSubmitBtn,
                    (!createName.trim() || createLoading) &&
                      styles.modalSubmitBtnDisabled,
                  ]}
                  onPress={handleCreateSubmit}
                  disabled={!createName.trim() || createLoading}>
                  {createLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Tạo lớp</Text>
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
    fontSize: 17,
    fontWeight: '800',
    color: '#2E3856',
  },
  topBarJoinBtn: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  topBarJoinText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4255FF',
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
  },
  joinClassBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4255FF',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  joinClassBtnIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  joinClassBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  createClassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#4255FF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  createClassBtnIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  createClassBtnText: {
    color: '#4255FF',
    fontSize: 14,
    fontWeight: '700',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconBoxEmoji: {
    fontSize: 22,
  },
  cardHeaderTitleBox: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 3,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4255FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  miniAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  teacherName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#60646C',
  },
  cardArrow: {
    fontSize: 22,
    color: '#939BB4',
    marginLeft: 6,
  },
  classDescription: {
    fontSize: 13,
    color: '#60646C',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F7',
  },
  metaBadge: {
    backgroundColor: '#F6F7FB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#60646C',
  },
  codeBadge: {
    backgroundColor: '#EEF2FF',
  },
  codeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4255FF',
  },
  teacherBadge: {
    backgroundColor: '#E6F9F0',
  },
  teacherBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
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
  primaryActionButton: {
    backgroundColor: '#4255FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
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
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#60646C',
    lineHeight: 18,
  },
  noticeBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  noticeSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  noticeError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  noticeTextSuccess: {
    color: '#047857',
  },
  noticeTextError: {
    color: '#B91C1C',
  },
  codeInput: {
    height: 52,
    backgroundColor: '#F6F7FB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#4255FF',
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '800',
    color: '#2E3856',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 6,
  },
  formInput: {
    height: 48,
    backgroundColor: '#F6F7FB',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#2E3856',
    marginBottom: 14,
  },
  formInputArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#E8ECF4',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
