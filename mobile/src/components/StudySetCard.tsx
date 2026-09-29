import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StudySet } from '@/types/studySet';

interface StudySetCardProps {
  studySet: StudySet;
  onPress?: (studySet: StudySet) => void;
}

export default function StudySetCard({ studySet, onPress }: StudySetCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress(studySet);
    } else {
      router.push(`/study-set/${studySet.set_id}` as any);
    }
  };

  const creatorDisplayName =
    studySet.creator_full_name || studySet.creator_username || `Người dùng #${studySet.creator_id}`;

  const initialLetter = (creatorDisplayName[0] || 'U').toUpperCase();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}>
      {/* Hàng trên: Danh mục & Số lượng thẻ */}
      <View style={styles.topRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{studySet.category || 'Từ vựng'}</Text>
        </View>
        <View style={styles.cardCountBadge}>
          <Text style={styles.cardCountText}>{studySet.card_count || 0} thẻ</Text>
        </View>
      </View>

      {/* Tiêu đề bộ học */}
      <Text style={styles.title} numberOfLines={2}>
        {studySet.title}
      </Text>

      {/* Mô tả bộ học (nếu có) */}
      {!!studySet.description && (
        <Text style={styles.description} numberOfLines={2}>
          {studySet.description}
        </Text>
      )}

      {/* Hàng chân thẻ: Thông tin người tạo & Ngôn ngữ */}
      <View style={styles.footerRow}>
        <View style={styles.creatorContainer}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initialLetter}</Text>
          </View>
          <Text style={styles.creatorName} numberOfLines={1}>
            {creatorDisplayName}
          </Text>
        </View>

        {studySet.language && (
          <Text style={styles.languageText}>{studySet.language}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    color: '#4255FF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardCountBadge: {
    backgroundColor: '#F6F7FB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardCountText: {
    color: '#60646C',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E3856',
    marginBottom: 6,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#60646C',
    lineHeight: 20,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F7',
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4255FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  creatorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    flexShrink: 1,
  },
  languageText: {
    fontSize: 12,
    color: '#939BB4',
    fontWeight: '500',
  },
});
