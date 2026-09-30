import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { Card } from '@/types/card';
import { playAudio } from '@/utils/audioPlayer';

interface FlashcardPreviewProps {
  card: Card;
  index?: number;
  isStudied?: boolean;
  canEdit?: boolean;
  onEdit?: (card: Card) => void;
  onDelete?: (card: Card) => void;
}

export default function FlashcardPreview({
  card,
  index,
  isStudied,
  canEdit = false,
  onEdit,
  onDelete,
}: FlashcardPreviewProps) {
  const displayPosition = card.position ?? (index !== undefined ? index + 1 : null);
  const hasExample = Boolean(card.example && card.example.trim());
  const hasPronunciation = Boolean(card.pronunciation && card.pronunciation.trim());
  const hasAudio = Boolean(card.audio_url && card.audio_url.trim());

  return (
    <View style={styles.card}>
      {/* Header của thẻ: Thuật ngữ, Phát âm, Nút Audio & Huy hiệu */}
      <View style={styles.topRow}>
        <View style={styles.termContainer}>
          <View style={styles.termTitleRow}>
            <Text style={styles.termText}>{card.term}</Text>
            {hasAudio && (
              <TouchableOpacity
                style={styles.audioBtn}
                onPress={() => playAudio(card.audio_url)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.audioBtnText}>🔊</Text>
              </TouchableOpacity>
            )}
          </View>

          {hasPronunciation && (
            <Text style={styles.pronunciationText}>{card.pronunciation}</Text>
          )}
        </View>

        <View style={styles.badgeRow}>
          {isStudied && (
            <View style={styles.studiedBadge}>
              <Text style={styles.studiedBadgeText}>✓ Đã học</Text>
            </View>
          )}
          {displayPosition !== null && (
            <View style={styles.indexBadge}>
              <Text style={styles.indexBadgeText}>#{displayPosition}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Định nghĩa / Nghĩa của từ */}
      <Text style={styles.definitionText}>{card.definition}</Text>

      {/* Câu ví dụ ngữ cảnh minh họa (chỉ hiển thị khi có ví dụ) */}
      {hasExample && (
        <View style={styles.exampleContainer}>
          <Text style={styles.exampleLabel}>💬 Ví dụ:</Text>
          <Text style={styles.exampleText}>"{card.example?.trim()}"</Text>
        </View>
      )}

      {/* Hình ảnh minh họa (nếu có) */}
      {!!card.image_url && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: card.image_url }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Hàng nút hành động chỉnh sửa / xóa dành cho chủ sở hữu */}
      {canEdit && (
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={styles.cardEditButton}
            onPress={() => onEdit?.(card)}
            activeOpacity={0.7}>
            <Text style={styles.cardEditButtonText}>✏️ Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardDeleteButton}
            onPress={() => onDelete?.(card)}
            activeOpacity={0.7}>
            <Text style={styles.cardDeleteButtonText}>🗑️ Xóa</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E8ECF4',
    shadowColor: '#2E3856',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  termContainer: {
    flex: 1,
    marginRight: 8,
  },
  termTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  termText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E3856',
  },
  audioBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  audioBtnText: {
    fontSize: 14,
  },
  pronunciationText: {
    fontSize: 14,
    color: '#4255FF',
    fontStyle: 'italic',
    marginTop: 2,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  studiedBadge: {
    backgroundColor: '#E6F9F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  studiedBadgeText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '700',
  },
  indexBadge: {
    backgroundColor: '#F6F7FB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  indexBadgeText: {
    fontSize: 12,
    color: '#939BB4',
    fontWeight: '700',
  },
  definitionText: {
    fontSize: 15,
    color: '#303545',
    lineHeight: 22,
    marginBottom: 8,
  },
  exampleContainer: {
    backgroundColor: '#F8F9FD',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3.5,
    borderLeftColor: '#4255FF',
    marginTop: 4,
    marginBottom: 8,
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60646C',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  exampleText: {
    fontSize: 14,
    color: '#2E3856',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  imageContainer: {
    marginTop: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 160,
    borderRadius: 10,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F7',
  },
  cardEditButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  cardEditButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4255FF',
  },
  cardDeleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  cardDeleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
});
