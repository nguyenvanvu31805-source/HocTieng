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
import { useAuth, User } from '@/contexts/AuthContext';
import api from '@/services/api';

interface LoginResponseData {
  token: string;
  user: User;
}

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    setErrorMessage('');

    // Validation phía Client
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setErrorMessage('Vui lòng nhập email hoặc tên đăng nhập.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    try {
      setLoading(true);

      // Gọi Backend endpoint POST /api/auth/login
      const response = await api.post<LoginResponseData>('/auth/login', {
        identifier: trimmedIdentifier,
        email: trimmedIdentifier,
        username: trimmedIdentifier,
        password: password,
      });

      if (response.success && response.data?.token && response.data?.user) {
        // Lưu token và thông tin user vào AuthContext & SecureStore
        await login(response.data.token, response.data.user);
        // Điều hướng vào khu vực chính (tabs)
        router.replace('/(tabs)' as any);
      } else {
        setErrorMessage(response.message || 'Đăng nhập không thành công.');
      }
    } catch (error: any) {
      // Xử lý thông báo lỗi từ server hoặc mạng
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
            <Text style={styles.welcomeTitle}>Đăng nhập</Text>
            <Text style={styles.welcomeSubtitle}>
              Chào mừng bạn trở lại! Hãy đăng nhập để tiếp tục học tập.
            </Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Thông báo lỗi nếu có */}
            {!!errorMessage && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Ô nhập Identifier */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email hoặc Tên đăng nhập</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập email hoặc tên đăng nhập"
                placeholderTextColor="#939BB4"
                value={identifier}
                onChangeText={(text) => {
                  setIdentifier(text);
                  if (errorMessage) setErrorMessage('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            {/* Ô nhập Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
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
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}>
                  <Text style={styles.eyeText}>{showPassword ? 'Ẩn' : 'Hiện'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Nút Đăng nhập */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            {/* Link chuyển sang Đăng ký */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerPrompt}>Chưa có tài khoản? </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register' as any)}
                disabled={loading}>
                <Text style={styles.registerLink}>Đăng ký ngay</Text>
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#4255FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
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
    fontSize: 24,
    fontWeight: '800',
    color: '#2E3856',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#303545',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: '#FFEBEA',
    borderWidth: 1,
    borderColor: '#FF4D4F',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  errorText: {
    color: '#D93025',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E3856',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F6F7FB',
    borderWidth: 1.5,
    borderColor: '#E0E1E6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
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
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
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
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerPrompt: {
    fontSize: 14,
    color: '#60646C',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4255FF',
  },
});
