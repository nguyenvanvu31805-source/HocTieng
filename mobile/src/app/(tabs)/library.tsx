import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { StudySet } from '@/types/studySet';
import api from '@/services/api';
import StudySetCard from '@/components/StudySetCard';

type TabFilter = 'all' | 'my' | 'bookmarks';

export default function LibraryScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchStudySets = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      setErrorMessage('');

      try {
        let endpoint = '/study-sets';
        const trimmedSearch = searchQuery.trim();

        if (activeTab === 'my') {
          endpoint = '/study-sets/my';
        } else if (activeTab === 'bookmarks') {
          endpoint = '/bookmarks';
        } else if (trimmedSearch) {
          endpoint = `/study-sets?search=${encodeURIComponent(trimmedSearch)}`;
        }

        const response = await api.get<StudySet[]>(endpoint);
        if (response.success && Array.isArray(response.data)) {
          // Lọc phía client nếu đang ở tab 'my' hoặc 'bookmarks' mà có nhập từ khóa tìm kiếm
          let result = response.data;
          if (activeTab !== 'all' && trimmedSearch) {
            const lowerSearch = trimmedSearch.toLowerCase();
            result = result.filter(
              (item) =>
                item.title?.toLowerCase().includes(lowerSearch) ||
                item.description?.toLowerCase().includes(lowerSearch) ||
                item.category?.toLowerCase().includes(lowerSearch),
            );
          }
          setStudySets(result);
        } else {
          setStudySets([]);
        }
      } catch (error: any) {
        setErrorMessage(
          error?.data?.message ||
            error?.message ||
            'Không thể tải dữ liệu thư viện. Vui lòng thử lại.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, searchQuery],
  );

  // Gọi API khi chuyển tab hoặc khi searchQuery thay đổi (debounce 300ms)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchStudySets();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [fetchStudySets]);

  // Tự động làm mới danh sách khi quay lại màn hình Library (ví dụ sau khi vừa bookmark/bỏ bookmark ở Detail)
  useFocusEffect(
    useCallback(() => {
      fetchStudySets(true);
    }, [fetchStudySets]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStudySets(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Header của FlatList
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.pageTitle}>Thư viện</Text>

      {/* Ô tìm kiếm */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo tên bộ học, chủ đề..."
          placeholderTextColor="#939BB4"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {!!searchQuery && (
          <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bộ lọc Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, activeTab === 'all' && styles.filterTabActive]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.filterTabText,
              activeTab === 'all' && styles.filterTabTextActive,
            ]}>
            Tất cả
          </Text>
        </TouchableOpacity>

        {isAuthenticated && (
          <>
            <TouchableOpacity
              style={[styles.filterTab, activeTab === 'my' && styles.filterTabActive]}
              onPress={() => setActiveTab('my')}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.filterTabText,
                  activeTab === 'my' && styles.filterTabTextActive,
                ]}>
                Của tôi
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                activeTab === 'bookmarks' && styles.filterTabActive,
              ]}
              onPress={() => setActiveTab('bookmarks')}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.filterTabText,
                  activeTab === 'bookmarks' && styles.filterTabTextActive,
                ]}>
                Đã lưu
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  // Hiển thị khi đang tải / lỗi / trống
  const renderEmptyOrError = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4255FF" />
          <Text style={styles.loadingText}>Đang tải danh sách bộ học...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>Đã xảy ra lỗi</Text>
          <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchStudySets(false)}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    let emptyMessage = 'Chưa có bộ học nào.';
    if (searchQuery.trim()) {
      emptyMessage = `Không tìm thấy bộ học nào phù hợp với từ khóa "${searchQuery.trim()}".`;
    } else if (activeTab === 'my') {
      emptyMessage = 'Bạn chưa tạo bộ học nào của riêng mình.';
    } else if (activeTab === 'bookmarks') {
      emptyMessage = 'Bạn chưa đánh dấu lưu bộ học nào.';
    }

    return (
      <View style={styles.centerBox}>
        <Text style={styles.stateIcon}>📖</Text>
        <Text style={styles.stateTitle}>Không có dữ liệu</Text>
        <Text style={styles.stateSubtitle}>{emptyMessage}</Text>
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
    paddingTop: 14,
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#E0E1E6',
    marginBottom: 14,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2E3856',
  },
  clearButton: {
    padding: 6,
  },
  clearButtonText: {
    color: '#939BB4',
    fontSize: 14,
    fontWeight: '700',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#E8ECF4',
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#60646C',
  },
  filterTabTextActive: {
    color: '#4255FF',
    fontWeight: '700',
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
  stateIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 6,
  },
  stateSubtitle: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
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
});
