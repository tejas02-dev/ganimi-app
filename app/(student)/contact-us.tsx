import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/typography';

const PHONE_GENERAL = '+91 9665014600';
const PHONE_TECH = '+91 9665014700';
const EMAIL_SUPPORT = 'support@ganimi.app';
const HOURS = 'Available Mon–Fri, 9am – 6pm IST';

const CONTACT_ITEMS = [
  {
    id: 'general',
    icon: 'call' as const,
    value: PHONE_GENERAL,
    label: 'General Inquiries',
    onPress: () => Linking.openURL(`tel:${PHONE_GENERAL.replace(/\s/g, '')}`).catch(() => {}),
  },
  {
    id: 'tech',
    icon: 'headset' as const,
    value: PHONE_TECH,
    label: 'Technical Support',
    onPress: () => Linking.openURL(`tel:${PHONE_TECH.replace(/\s/g, '')}`).catch(() => {}),
  },
  {
    id: 'email',
    icon: 'mail' as const,
    value: EMAIL_SUPPORT,
    label: 'Email Support',
    onPress: () => Linking.openURL(`mailto:${EMAIL_SUPPORT}`).catch(() => {}),
  },
];

export default function StudentContactUsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Contact Us</Text>
        <Text style={styles.subtitle}>We're here to help you with your learning journey.</Text>

        {CONTACT_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Ionicons name={item.icon} size={22} color={Colors.primary} />
            </View>
            <View style={styles.cardMiddle}>
              <Text style={styles.cardValue}>{item.value}</Text>
              <Text style={styles.cardLabel}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        ))}

        <View style={styles.decorative}>
          <Ionicons name="help-circle-outline" size={80} color={Colors.textLight} />
        </View>

        <TouchableOpacity
          style={styles.returnButton}
          onPress={() => router.replace('/(student)/dashboard' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="grid-outline" size={20} color={Colors.white} />
          <Text style={styles.returnButtonText}>Return to Dashboard</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>{HOURS}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardMiddle: { flex: 1 },
  cardValue: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  decorative: {
    alignItems: 'center',
    marginVertical: 24,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
  returnButtonText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.white,
  },
  footer: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
});
