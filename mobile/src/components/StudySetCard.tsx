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
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(47, 58, 29, 0.12)',
    shadowColor: '#2F3A1D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#F4FDE2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(47, 58, 29, 0.08)',
  },
  categoryText: {
    color: '#2F3A1D',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardCountBadge: {
    backgroundColor: '#F8FAF2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5EAD9',
  },
  cardCountText: {
    color: '#66705A',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2F3A1D',
    marginBottom: 6,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13.5,
    color: '#66705A',
    lineHeight: 19,
    marginBottom: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2E6',
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#CFFF74',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#2F3A1D',
    fontSize: 11,
    fontWeight: '800',
  },
  creatorName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#495057',
    flexShrink: 1,
  },
  languageText: {
    fontSize: 12,
    color: '#66705A',
    fontWeight: '500',
  },
});
