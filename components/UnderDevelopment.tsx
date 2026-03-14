import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/typography';

type UnderDevelopmentProps = {
  onReturn?: () => void;
  returnLabel?: string;
};

export function UnderDevelopment({
  onReturn,
  returnLabel = 'Return to Dashboard',
}: UnderDevelopmentProps) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Illustration card */}
      <View style={styles.illustrationCard}>
        <Ionicons
          name="construct-outline"
          size={80}
          color="#D4A574"
          style={styles.illustrationIcon}
        />
      </View>

      {/* Under development tag */}
      <View style={styles.tag}>
        <View style={styles.tagDot} />
        <Text style={styles.tagText}>UNDER DEVELOPMENT</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>Something Exciting is Brewing</Text>

      {/* Description */}
      <Text style={styles.description}>
        We're currently polishing this feature to ensure you have the best learning
        experience possible. Our team is working hard behind the scenes.
      </Text>

      {/* Return button */}
      {onReturn ? (
        <TouchableOpacity
          style={styles.returnButton}
          onPress={onReturn}
          activeOpacity={0.9}
        >
          <Ionicons name="grid-outline" size={20} color="#FFF" />
          <Text style={styles.returnButtonText}>{returnLabel.toUpperCase()}</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    alignItems: 'center',
  },
  illustrationCard: {
    width: '100%',
    aspectRatio: 1.1,
    maxHeight: 280,
    borderRadius: 24,
    backgroundColor: '#FDF3E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  illustrationIcon: {
    opacity: 0.9,
  },
  illustrationLabel: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: Typography.fontFamily.extraBold,
    letterSpacing: 2,
    color: '#C4956A',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  tagText: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#6B7280',
    fontFamily: Typography.fontFamily.semiBold,
  },
  title: {
    fontSize: 22,
    color: Colors.text,
    fontFamily: Typography.fontFamily.extraBold,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.regular,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 10,
    minWidth: 260,
  },
  returnButtonText: {
    fontSize: 13,
    letterSpacing: 0.8,
    color: '#FFF',
    fontFamily: Typography.fontFamily.semiBold,
  },
});
