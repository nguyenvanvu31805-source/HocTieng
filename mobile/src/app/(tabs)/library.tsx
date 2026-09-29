import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
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
import studySetService from '@/services/studySetService';
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

  // Trạng thái modal tạo bộ học mới
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formVisibility, setFormVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

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

  const handleOpenCreateModal = () => {
    setFormTitle('');
    setFormDescription('');
    setFormCategory('');
    setFormVisibility('PUBLIC');
    setFormError('');
    setCreateModalVisible(true);
  };

  const handleCreateSubmit = async () => {
    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle) {
      setFormError('Vui lòng nhập tên bộ học.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const response = await studySetService.createStudySet({
        title: trimmedTitle,
        description: formDescription.trim() || null,
        category: formCategory.trim() || null,
        visibility: formVisibility,
      });

      if (response.success && response.data) {
        setCreateModalVisible(false);
        fetchStudySets(true);
        Alert.alert('Thành công', 'Đã tạo bộ học mới!');
        router.push(`/study-set/${response.data.set_id}` as any);
      } else {
        setFormError(response.message || 'Không thể tạo bộ học. Vui lòng thử lại.');
      }
    } catch (error: any) {
      const msg =
        error?.status === 401
          ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : error?.data?.message ||
            error?.message ||
            'Không thể tạo bộ học. Vui lòng thử lại.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Header của FlatList
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Thư viện</Text>
        {isAuthenticated && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleOpenCreateModal}
            activeOpacity={0.8}>
            <Text style={styles.createButtonIcon}>＋</Text>
            <Text style={styles.createButtonText}>Tạo bộ học</Text>
          </TouchableOpacity>
        )}
      </View>

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

      {/* Modal Tạo Bộ học mới */}
      <Modal
        visible={createModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!submitting) setCreateModalVisible(false);
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo bộ học mới</Text>
              <Text style={styles.modalSubtitle}>
                Nhập thông tin cơ bản để tạo bộ từ vựng mới của bạn.
              </Text>
            </View>

            {!!formError && (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>
                Tên bộ học <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ví dụ: Từ vựng IELTS 7.0, Unit 1..."
                placeholderTextColor="#939BB4"
                value={formTitle}
                onChangeText={setFormTitle}
                editable={!submitting}
              />

              <Text style={styles.inputLabel}>Mô tả (tùy chọn)</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMulti]}
                placeholder="Ví dụ: Tổng hợp từ vựng quan trọng theo chủ đề..."
                placeholderTextColor="#939BB4"
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!submitting}
              />

              <Text style={styles.inputLabel}>Chủ đề (tùy chọn)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ví dụ: Tiếng Anh, Từ vựng, Công nghệ..."
                placeholderTextColor="#939BB4"
                value={formCategory}
                onChangeText={setFormCategory}
                editable={!submitting}
              />

              <Text style={styles.inputLabel}>Quyền riêng tư</Text>
              <View style={styles.visibilityRow}>
                <TouchableOpacity
                  style={[
                    styles.visibilityBtn,
                    formVisibility === 'PUBLIC' && styles.visibilityBtnActive,
                  ]}
                  onPress={() => setFormVisibility('PUBLIC')}
                  disabled={submitting}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.visibilityBtnText,
                      formVisibility === 'PUBLIC' && styles.visibilityBtnTextActive,
                    ]}>
                    🌐 Công khai
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.visibilityBtn,
                    formVisibility === 'PRIVATE' && styles.visibilityBtnActive,
                  ]}
                  onPress={() => setFormVisibility('PRIVATE')}
                  disabled={submitting}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.visibilityBtnText,
                      formVisibility === 'PRIVATE' && styles.visibilityBtnTextActive,
                    ]}>
                    🔒 Riêng tư
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCreateModalVisible(false)}
                disabled={submitting}
                activeOpacity={0.7}>
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, submitting && styles.modalSubmitBtnDisabled]}
                onPress={handleCreateSubmit}
                disabled={submitting}
                activeOpacity={0.8}>
                {submitting ? (
                  <View style={styles.submitLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Đang tạo...</Text>
                  </View>
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Tạo bộ học</Text>
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
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  headerContainer: {
    paddingTop: 14,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2E3856',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4255FF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#4255FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  createButtonIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    marginRight: 4,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    maxHeight: '85%',
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
    fontSize: 20,
    fontWeight: '800',
    color: '#2E3856',
    marginBottom: 6,
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
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  formErrorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 6,
    marginTop: 10,
  },
  requiredStar: {
    color: '#DC2626',
  },
  formInput: {
    backgroundColor: '#F8F9FD',
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2E3856',
  },
  formInputMulti: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  visibilityBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    backgroundColor: '#F8F9FD',
  },
  visibilityBtnActive: {
    borderColor: '#4255FF',
    backgroundColor: '#EEF2FF',
  },
  visibilityBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#60646C',
  },
  visibilityBtnTextActive: {
    color: '#4255FF',
    fontWeight: '700',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F7',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F0F2F7',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#60646C',
  },
  modalSubmitBtn: {
    flex: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#4255FF',
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#939BB4',
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

