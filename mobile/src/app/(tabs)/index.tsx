import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { StudySet } from '@/types/studySet';
import api from '@/services/api';
import StudySetCard from '@/components/StudySetCard';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchFeaturedSets = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setErrorMessage('');

    try {
      // Gọi API lấy danh sách bộ học
      const response = await api.get<StudySet[]>('/study-sets');
      if (response.success && Array.isArray(response.data)) {
        setStudySets(response.data);
      } else {
        setStudySets([]);
      }
    } catch (error: any) {
      setErrorMessage(
        error?.data?.message ||
          error?.message ||
          'Không thể tải dữ liệu bộ học. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturedSets();
  }, [fetchFeaturedSets]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeaturedSets(true);
  };

  const displayName = user?.full_name || user?.username || 'Bạn';

  // Header component cho FlatList
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Lời chào người dùng */}
      <View style={styles.greetingBox}>
        <View style={styles.greetingTextContainer}>
          <Text style={styles.greetingTitle}>Xin chào, {displayName}! 👋</Text>
          <Text style={styles.greetingSubtitle}>
            Hôm nay bạn muốn học thêm từ vựng gì nào?
          </Text>
        </View>
        <View style={styles.userBadge}>
          <Text style={styles.userBadgeText}>
            {(displayName[0] || 'U').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Banner tạo động lực học tập */}
      <View style={styles.bannerCard}>
        <Text style={styles.bannerEyebrow}>TIẾP TỤC HÀNH TRÌNH</Text>
        <Text style={styles.bannerTitle}>Học mỗi ngày, nhớ dài lâu.</Text>
        <Text style={styles.bannerText}>
          Ôn tập thường xuyên giúp ghi nhớ từ vựng sâu hơn theo phương pháp ngắt quãng.
        </Text>
        <TouchableOpacity
          style={styles.bannerButton}
          onPress={() => router.push('/(tabs)/library' as any)}
          activeOpacity={0.8}>
          <Text style={styles.bannerButtonText}>Khám phá Thư viện →</Text>
        </TouchableOpacity>
      </View>

      {/* Lối tắt truy cập Lớp học */}
      <TouchableOpacity
        style={styles.classesShortcutCard}
        onPress={() => router.push('/classes' as any)}
        activeOpacity={0.85}>
        <View style={styles.classesShortcutLeft}>
          <View style={styles.classesShortcutIconBox}>
            <Text style={styles.classesShortcutIcon}>🏫</Text>
          </View>
          <View style={styles.classesShortcutTextBox}>
            <Text style={styles.classesShortcutTitle}>Lớp học của tôi</Text>
            <Text style={styles.classesShortcutSubtitle}>
              Tham gia bằng mã hoặc quản lý lớp học
            </Text>
          </View>
        </View>
        <Text style={styles.classesShortcutArrow}>›</Text>
      </TouchableOpacity>

      {/* Tiêu đề danh sách */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Bộ học nổi bật</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/library' as any)}>
          <Text style={styles.seeAllText}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Footer / Empty / Error component
  const renderEmptyOrError = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4255FF" />
          <Text style={styles.loadingText}>Đang tải bộ học...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Đã xảy ra lỗi</Text>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchFeaturedSets(false)}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centerBox}>
        <Text style={styles.emptyIcon}>📚</Text>
        <Text style={styles.emptyTitle}>Chưa có bộ học nào</Text>
        <Text style={styles.emptySubtitle}>
          Hiện tại hệ thống chưa có bộ học công khai nào được tạo.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={loading || errorMessage ? [] : studySets}
        keyExtractor={(item) => String(item.set_id)}
        renderItem={({ item }) => (
          <StudySetCard
            studySet={item}
            onPress={(set) => router.push(`/study-set/${set.set_id}` as any)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyOrError}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4255FF']}
            tintColor="#4255FF"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  headerContainer: {
    paddingTop: 12,
    marginBottom: 8,
  },
  greetingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  greetingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2E3856',
    letterSpacing: 0.2,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: '#60646C',
    marginTop: 4,
  },
  userBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4255FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  userBadgeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  bannerCard: {
    backgroundColor: '#4255FF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  bannerEyebrow: {
    color: '#D2D8FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    lineHeight: 26,
  },
  bannerText: {
    color: '#E8ECFF',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  bannerButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: '#4255FF',
    fontSize: 13,
    fontWeight: '700',
  },
  classesShortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    marginBottom: 20,
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  classesShortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  classesShortcutIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  classesShortcutIcon: {
    fontSize: 22,
  },
  classesShortcutTextBox: {
    flex: 1,
  },
  classesShortcutTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 2,
  },
  classesShortcutSubtitle: {
    fontSize: 12,
    color: '#60646C',
  },
  classesShortcutArrow: {
    fontSize: 22,
    fontWeight: '600',
    color: '#939BB4',
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E3856',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4255FF',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#60646C',
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D93025',
    marginBottom: 6,
  },
  errorMessageText: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#4255FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: 20,
  },
});
