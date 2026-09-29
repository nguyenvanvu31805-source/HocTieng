import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import userService from '@/services/userService';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, updateUser, refreshUser } = useAuth();

  // Trạng thái modal Chỉnh sửa hồ sơ
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [formFullName, setFormFullName] = useState('');
  const [formAvatarUrl, setFormAvatarUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as any);
  };

  const handleOpenEditModal = async () => {
    setFormFullName(user?.full_name || '');
    setFormAvatarUrl(user?.avatar_url || '');
    setFormError('');
    setEditModalVisible(true);

    // Đồng bộ thông tin mới nhất từ server nếu có mạng
    try {
      const freshUser = await refreshUser();
      if (freshUser) {
        setFormFullName(freshUser.full_name || '');
        setFormAvatarUrl(freshUser.avatar_url || '');
      }
    } catch {
      // Giữ nguyên dữ liệu hiện có từ context
    }
  };

  const handleCancelEdit = () => {
    if (submitting) return;
    setEditModalVisible(false);
    setFormError('');
  };

  const handleSaveProfile = async () => {
    if (submitting) return;

    const trimmedFullName = formFullName.trim();
    const trimmedAvatarUrl = formAvatarUrl.trim();

    // Validation định dạng URL nếu người dùng nhập avatar_url
    if (trimmedAvatarUrl) {
      if (!/^https?:\/\//i.test(trimmedAvatarUrl)) {
        setFormError('Đường dẫn ảnh đại diện phải bắt đầu bằng http:// hoặc https://');
        return;
      }
    }

    setSubmitting(true);
    setFormError('');

    try {
      const updatedUser = await userService.updateProfile({
        full_name: trimmedFullName || null,
        avatar_url: trimmedAvatarUrl || null,
      });

      updateUser(updatedUser);
      setEditModalVisible(false);
      Alert.alert('Thành công', 'Cập nhật hồ sơ thành công');
    } catch (err: any) {
      console.error('Lỗi cập nhật hồ sơ:', err);
      const status = err?.status;
      if (status === 401) {
        Alert.alert('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại.', [
          {
            text: 'OK',
            onPress: async () => {
              await logout();
              router.replace('/(auth)/login' as any);
            },
          },
        ]);
      } else if (status === 400) {
        setFormError(err?.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
      } else if (status === 403) {
        setFormError('Bạn không có quyền cập nhật thông tin này.');
      } else if (status === 404) {
        setFormError('Không tìm thấy thông tin tài khoản trên hệ thống.');
      } else {
        setFormError(err?.message || 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = user?.full_name || user?.username || 'Chưa cập nhật';
  const initialLetter = (displayName[0] || 'U').toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Text style={styles.pageTitle}>Hồ sơ</Text>

        {isAuthenticated && user ? (
          <View style={styles.profileCard}>
            <View style={styles.avatarLarge}>
              {user.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarLargeText}>{initialLetter}</Text>
              )}
            </View>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userHandle}>@{user.username}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>

            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Vai trò: {user.role}</Text>
            </View>

            {/* Nút Chỉnh sửa hồ sơ */}
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={handleOpenEditModal}
              activeOpacity={0.8}>
              <Text style={styles.editProfileButtonIcon}>✏️</Text>
              <Text style={styles.editProfileButtonText}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.classesButton}
              onPress={() => router.push('/classes' as any)}
              activeOpacity={0.8}>
              <Text style={styles.classesButtonIcon}>🏫</Text>
              <Text style={styles.classesButtonText}>Lớp học của tôi</Text>
              <Text style={styles.classesButtonArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}>
              <Text style={styles.logoutButtonText}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.guestCard}>
            <Text style={styles.guestTitle}>Bạn chưa đăng nhập</Text>
            <Text style={styles.guestSubtitle}>
              Hãy đăng nhập để lưu tiến độ và bộ từ vựng của bạn.
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push('/(auth)/login' as any)}
              activeOpacity={0.8}>
              <Text style={styles.loginButtonText}>Đăng nhập ngay</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Modal Chỉnh sửa hồ sơ */}
      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent
        onRequestClose={handleCancelEdit}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
              <Text style={styles.modalSubtitle}>
                Cập nhật thông tin hiển thị của bạn trên hệ thống
              </Text>
            </View>

            {!!formError && (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            )}

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {/* Tên đăng nhập - Không cho sửa */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Tên đăng nhập</Text>
                  <Text style={styles.fixedBadge}>Cố định</Text>
                </View>
                <View style={styles.readOnlyContainer}>
                  <Text style={styles.readOnlyText}>@{user?.username}</Text>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              </View>

              {/* Email - Không cho sửa */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <Text style={styles.fixedBadge}>Cố định</Text>
                </View>
                <View style={styles.readOnlyContainer}>
                  <Text style={styles.readOnlyText}>{user?.email}</Text>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              </View>

              {/* Họ và tên - Cho phép chỉnh sửa */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Họ và tên</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ví dụ: Nguyễn Văn A..."
                  placeholderTextColor="#939BB4"
                  value={formFullName}
                  onChangeText={setFormFullName}
                  editable={!submitting}
                  maxLength={100}
                />
              </View>

              {/* Đường dẫn ảnh đại diện - Cho phép chỉnh sửa */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Đường dẫn ảnh đại diện (URL)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="https://example.com/avatar.jpg"
                  placeholderTextColor="#939BB4"
                  value={formAvatarUrl}
                  onChangeText={setFormAvatarUrl}
                  editable={!submitting}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Xem trước ảnh đại diện nếu có nhập URL */}
              {!!formAvatarUrl.trim() && /^https?:\/\//i.test(formAvatarUrl.trim()) && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Xem trước ảnh:</Text>
                  <Image
                    source={{ uri: formAvatarUrl.trim() }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={handleCancelEdit}
                disabled={submitting}
                activeOpacity={0.7}>
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, submitting && styles.modalSubmitBtnDisabled]}
                onPress={handleSaveProfile}
                disabled={submitting}
                activeOpacity={0.8}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarLarge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#4255FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarLargeText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#60646C',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#939BB4',
    marginBottom: 14,
  },
  roleBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 20,
  },
  roleBadgeText: {
    color: '#4255FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4255FF',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    width: '100%',
    marginBottom: 12,
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  editProfileButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  editProfileButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  classesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7FB',
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    width: '100%',
    marginBottom: 12,
  },
  classesButtonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  classesButtonText: {
    flex: 1,
    color: '#2E3856',
    fontSize: 15,
    fontWeight: '700',
  },
  classesButtonArrow: {
    fontSize: 20,
    fontWeight: '700',
    color: '#939BB4',
  },
  logoutButton: {
    backgroundColor: '#FFEBEA',
    borderWidth: 1,
    borderColor: '#FFD1CF',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#D93025',
    fontSize: 15,
    fontWeight: '700',
  },
  guestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 6,
  },
  guestSubtitle: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  loginButton: {
    backgroundColor: '#4255FF',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#60646C',
    lineHeight: 18,
  },
  formErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  formErrorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 6,
  },
  fixedBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#939BB4',
    backgroundColor: '#F0F2F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  readOnlyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F6F7FB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 14,
    color: '#60646C',
    fontWeight: '600',
  },
  lockIcon: {
    fontSize: 14,
  },
  formInput: {
    backgroundColor: '#F8F9FD',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#2E3856',
  },
  previewBox: {
    alignItems: 'center',
    marginBottom: 14,
    padding: 10,
    backgroundColor: '#F8F9FD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#60646C',
    marginBottom: 8,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#4255FF',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F7',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F0F2F7',
  },
  modalCancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#60646C',
  },
  modalSubmitBtn: {
    flex: 2,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#4255FF',
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.6,
  },
  modalSubmitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
