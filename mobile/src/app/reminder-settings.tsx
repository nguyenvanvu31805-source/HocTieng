import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import reminderService from '@/services/reminderService';
import {
  AVAILABLE_REMINDER_TIMES,
  DEFAULT_REMINDER_SETTINGS,
  ReminderSettings,
} from '@/types/reminder';

export default function ReminderSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.user_id || null;

  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState<string>('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await reminderService.getReminderSettings(userId);
      setSettings(data);
    } catch {
      setErrorMessage('Không thể tải cài đặt nhắc học.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleToggle = async (value: boolean) => {
    const updated: ReminderSettings = {
      ...settings,
      enabled: value,
    };
    setSettings(updated);

    const success = await reminderService.saveReminderSettings(updated, userId);
    if (success) {
      setSaveStatus('Đã cập nhật cài đặt');
      setTimeout(() => setSaveStatus(''), 2000);
    } else {
      setErrorMessage('Không thể lưu cài đặt.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleSelectTime = async (time: string) => {
    if (settings.reminderTime === time) return;

    const updated: ReminderSettings = {
      ...settings,
      reminderTime: time,
    };
    setSettings(updated);

    const success = await reminderService.saveReminderSettings(updated, userId);
    if (success) {
      setSaveStatus(`Đã chọn ${time}`);
      setTimeout(() => setSaveStatus(''), 2000);
    } else {
      setErrorMessage('Không thể lưu cài đặt.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Nhắc học</Text>
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4255FF" />
          <Text style={styles.loadingText}>Đang tải cài đặt nhắc học...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage && !settings) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Nhắc học</Text>
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Đã xảy ra lỗi</Text>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadSettings}
              activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backErrorBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}>
              <Text style={styles.backErrorBtnText}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.screenTitle}>Nhắc học</Text>
        </View>
        {saveStatus ? (
          <View style={styles.saveBadge}>
            <Text style={styles.saveBadgeText}>✓ {saveStatus}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Error notification banner if any */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Card 1: Bật / Tắt Nhắc học hằng ngày */}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchIconBox}>
              <Text style={styles.switchIcon}>🔔</Text>
            </View>
            <View style={styles.switchTextBox}>
              <Text style={styles.cardTitle}>Nhắc học hằng ngày</Text>
              <Text style={styles.cardSubtitle}>
                Thiết lập thời gian để nhắc bạn duy trì việc học mỗi ngày.
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={handleToggle}
              trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
              thumbColor={settings.enabled ? '#4255FF' : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Card 2: Trạng thái cài đặt */}
        <View
          style={[
            styles.statusCard,
            settings.enabled ? styles.statusCardEnabled : styles.statusCardDisabled,
          ]}>
          <View style={styles.statusHeaderRow}>
            <Text style={styles.statusIcon}>
              {settings.enabled ? '⏰' : '🔕'}
            </Text>
            <View style={styles.statusTextBox}>
              <Text
                style={[
                  styles.statusTitle,
                  settings.enabled
                    ? styles.statusTitleEnabled
                    : styles.statusTitleDisabled,
                ]}>
                {settings.enabled ? 'Nhắc học đang bật' : 'Nhắc học đang tắt'}
              </Text>
              <Text
                style={[
                  styles.statusDesc,
                  settings.enabled
                    ? styles.statusDescEnabled
                    : styles.statusDescDisabled,
                ]}>
                {settings.enabled
                  ? `Hệ thống sẽ nhắc bạn học tập vào lúc ${settings.reminderTime} hằng ngày.`
                  : 'Bật để nhận thông báo nhắc nhở duy trì chuỗi học tập của bạn.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Card 3: Chọn thời gian nhắc học */}
        <View style={styles.card}>
          <View style={styles.timeHeader}>
            <View style={styles.timeIconBox}>
              <Text style={styles.timeIcon}>⏱</Text>
            </View>
            <View style={styles.timeTitleBox}>
              <Text style={styles.cardTitle}>Thời gian nhắc học</Text>
              <Text style={styles.cardSubtitle}>
                Khung giờ đang chọn: <Text style={styles.highlightTime}>{settings.reminderTime}</Text>
              </Text>
            </View>
          </View>

          <View style={styles.timeGrid}>
            {AVAILABLE_REMINDER_TIMES.map((time) => {
              const isSelected = settings.reminderTime === time;
              return (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeChip,
                    isSelected && styles.timeChipSelected,
                    !settings.enabled && styles.timeChipDisabled,
                  ]}
                  onPress={() => handleSelectTime(time)}
                  activeOpacity={0.75}>
                  <Text
                    style={[
                      styles.timeChipText,
                      isSelected && styles.timeChipTextSelected,
                      !settings.enabled && styles.timeChipTextDisabled,
                    ]}>
                    {time}
                  </Text>
                  {isSelected && (
                    <Text style={styles.timeCheckIcon}> ✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Card 4: Ghi chú thông tin bảo mật */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Cài đặt nhắc học được lưu trữ an toàn ngay trên thiết bị của bạn và không gửi
            thông tin cá nhân lên máy chủ.
          </Text>
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 12,
  },
  backBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E3856',
  },
  titleContainer: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E3856',
  },
  saveBadge: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  saveBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  switchIcon: {
    fontSize: 20,
  },
  switchTextBox: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  statusCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusCardEnabled: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusCardDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  statusTextBox: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  statusTitleEnabled: {
    color: '#15803D',
  },
  statusTitleDisabled: {
    color: '#64748B',
  },
  statusDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusDescEnabled: {
    color: '#166534',
  },
  statusDescDisabled: {
    color: '#94A3B8',
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timeIcon: {
    fontSize: 18,
  },
  timeTitleBox: {
    flex: 1,
  },
  highlightTime: {
    fontWeight: '800',
    color: '#4255FF',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    width: '31%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  timeChipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4255FF',
  },
  timeChipDisabled: {
    opacity: 0.65,
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  timeChipTextSelected: {
    color: '#4255FF',
    fontWeight: '800',
  },
  timeChipTextDisabled: {
    color: '#64748B',
  },
  timeCheckIcon: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4255FF',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 6,
  },
  errorMessageText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  retryButton: {
    backgroundColor: '#4255FF',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  backErrorBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  backErrorBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
