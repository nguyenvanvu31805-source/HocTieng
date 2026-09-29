import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as any);
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
              <Text style={styles.avatarLargeText}>{initialLetter}</Text>
            </View>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userHandle}>@{user.username}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>

            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Vai trò: {user.role}</Text>
            </View>

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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4255FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarLargeText: {
    color: '#FFFFFF',
    fontSize: 30,
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
    marginBottom: 24,
  },
  roleBadgeText: {
    color: '#4255FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
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
});
