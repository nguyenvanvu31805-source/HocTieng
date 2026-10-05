import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { useRouter } from 'expo-router';
import { User } from '@/contexts/AuthContext';
import api from '@/services/api';

export default function RegisterScreen() {
  const router = useRouter();

  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleRegister = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    // 1. Validation phía Client
    const trimmedFullName = fullName.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!role || (role !== 'STUDENT' && role !== 'TEACHER')) {
      setErrorMessage('Vui lòng chọn vai trò: Học viên hoặc Giáo viên.');
      return;
    }

    if (!trimmedUsername) {
      setErrorMessage('Vui lòng nhập tên người dùng (username).');
      return;
    }
    if (trimmedUsername.length < 3) {
      setErrorMessage('Tên người dùng phải có ít nhất 3 ký tự.');
      return;
    }
    if (/\s/.test(trimmedUsername)) {
      setErrorMessage('Tên người dùng không được chứa khoảng trắng.');
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ email.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Địa chỉ email không đúng định dạng.');
      return;
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (!confirmPassword) {
      setErrorMessage('Vui lòng xác nhận lại mật khẩu.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setLoading(true);

      // 2. Gửi request POST tới Backend /api/auth/register kèm role
      const response = await api.post<User>('/auth/register', {
        username: trimmedUsername,
        email: trimmedEmail,
        password: password,
        full_name: trimmedFullName || trimmedUsername,
        role: role,
      });

      if (response.success) {
        setSuccessMessage('Đăng ký tài khoản thành công! Đang chuyển về Đăng nhập...');
        setTimeout(() => {
          router.replace('/(auth)/login' as any);
        }, 1500);
      } else {
        setErrorMessage(response.message || 'Đăng ký không thành công.');
      }
    } catch (error: any) {
      const msg =
        error?.data?.message ||
        error?.message ||
        'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Header & Logo */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>HT</Text>
            </View>
            <Text style={styles.brandTitle}>HocTieng</Text>
            <Text style={styles.welcomeTitle}>Tạo tài khoản</Text>
            <Text style={styles.welcomeSubtitle}>
              Bắt đầu hành trình học từ vựng tiếng Anh cùng Quizlet Clone
            </Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Banner Lỗi */}
            {!!errorMessage && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Banner Thành công */}
            {!!successMessage && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            {/* Chọn vai trò (Role Selector) */}
            <View style={styles.roleContainer}>
              <Text style={styles.roleLabel}>Bạn là? *</Text>
              <View style={styles.roleOptions}>
                <TouchableOpacity
                  style={[
                    styles.roleOptionCard,
                    role === 'STUDENT' && styles.roleOptionCardSelected,
                  ]}
                  onPress={() => {
                    setRole('STUDENT');
                    if (errorMessage) setErrorMessage('');
                  }}
                  activeOpacity={0.7}
                  disabled={loading || !!successMessage}>
                  <Text
                    style={[
                      styles.roleOptionTitle,
                      role === 'STUDENT' && styles.roleOptionTitleSelected,
                    ]}>
                    Học viên
                  </Text>
                  <Text
                    style={[
                      styles.roleOptionSubtitle,
                      role === 'STUDENT' && styles.roleOptionSubtitleSelected,
                    ]}>
                    Học và luyện tập
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleOptionCard,
                    role === 'TEACHER' && styles.roleOptionCardSelected,
                  ]}
                  onPress={() => {
                    setRole('TEACHER');
                    if (errorMessage) setErrorMessage('');
                  }}
                  activeOpacity={0.7}
                  disabled={loading || !!successMessage}>
                  <Text
                    style={[
                      styles.roleOptionTitle,
                      role === 'TEACHER' && styles.roleOptionTitleSelected,
                    ]}>
                    Giáo viên
                  </Text>
                  <Text
                    style={[
                      styles.roleOptionSubtitle,
                      role === 'TEACHER' && styles.roleOptionSubtitleSelected,
                    ]}>
                    Quản lý lớp học
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Họ và tên */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Họ và tên</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: Nguyễn Văn An"
                placeholderTextColor="#939BB4"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (errorMessage) setErrorMessage('');
                }}
                editable={!loading && !successMessage}
              />
            </View>

            {/* Tên người dùng */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tên người dùng (Username) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: annguyen99"
                placeholderTextColor="#939BB4"
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (errorMessage) setErrorMessage('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading && !successMessage}
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Địa chỉ Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor="#939BB4"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMessage) setErrorMessage('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading && !successMessage}
              />
            </View>

            {/* Mật khẩu */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu (tối thiểu 6 ký tự) *</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor="#939BB4"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading && !successMessage}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.eyeText}>{showPassword ? 'Ẩn' : 'Hiện'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Xác nhận mật khẩu */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Xác nhận mật khẩu *</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor="#939BB4"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading && !successMessage}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.eyeText}>
                    {showConfirmPassword ? 'Ẩn' : 'Hiện'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Nút Đăng ký */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleRegister}
              disabled={loading || !!successMessage}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {role === 'TEACHER' ? 'Đăng ký Giáo viên' : 'Đăng ký Học viên'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Chuyển hướng về Login */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginPrompt}>Đã có tài khoản? </Text>
              <TouchableOpacity
                onPress={() => router.replace('/(auth)/login' as any)}
                disabled={loading}>
                <Text style={styles.loginLink}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#4255FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E3856',
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2E3856',
    marginTop: 12,
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  formContainer: {
    marginTop: 6,
  },
  roleContainer: {
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E3856',
    marginBottom: 8,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  roleOptionCard: {
    flex: 1,
    backgroundColor: '#F6F7FB',
    borderWidth: 1.5,
    borderColor: '#E0E1E6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleOptionCardSelected: {
    borderColor: '#4255FF',
    backgroundColor: '#EEF1FF',
  },
  roleOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 2,
  },
  roleOptionTitleSelected: {
    color: '#4255FF',
  },
  roleOptionSubtitle: {
    fontSize: 11,
    color: '#939BB4',
    textAlign: 'center',
  },
  roleOptionSubtitleSelected: {
    color: '#4255FF',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#FDE8E8',
    borderColor: '#F98080',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  errorText: {
    color: '#E02424',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  successContainer: {
    backgroundColor: '#DEF7EC',
    borderColor: '#31C48D',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  successText: {
    color: '#03543F',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E3856',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F6F7FB',
    borderWidth: 1.5,
    borderColor: '#E0E1E6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2E3856',
  },
  passwordInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 64,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  eyeText: {
    color: '#4255FF',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#4255FF',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#A0B0FF',
    elevation: 0,
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPrompt: {
    fontSize: 14,
    color: '#60646C',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4255FF',
  },
});
