import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { Card } from '@/types/card';

interface FlashcardPreviewProps {
  card: Card;
  index?: number;
  isStudied?: boolean;
}

export default function FlashcardPreview({
  card,
  index,
  isStudied,
}: FlashcardPreviewProps) {
  const displayPosition = card.position ?? (index !== undefined ? index + 1 : null);

  return (
    <View style={styles.card}>
      {/* Header của thẻ: Từ vựng & Số thứ tự */}
      <View style={styles.topRow}>
        <View style={styles.termContainer}>
          <Text style={styles.termText}>{card.term}</Text>
          {!!card.pronunciation && (
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

      {/* Câu ví dụ (nếu có) */}
      {!!card.example && (
        <View style={styles.exampleContainer}>
          <Text style={styles.exampleLabel}>Ví dụ:</Text>
          <Text style={styles.exampleText}>"{card.example}"</Text>
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
  termText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E3856',
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
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4255FF',
    marginTop: 4,
    marginBottom: 8,
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60646C',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  exampleText: {
    fontSize: 13,
    color: '#495057',
    fontStyle: 'italic',
    lineHeight: 18,
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
});
