import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const PHONE_GANIMI = '+91 9665014600';
const PHONE_ADDONS = '+91 9665014700';
const EMAIL_SUPPORT = 'no-reply@ganimi.app';

export default function VendorContactScreen() {
  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\\s/g, '')}`).catch(() => {
      // ignore – best-effort only
    });
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${EMAIL_SUPPORT}`).catch(() => {
      // ignore – best-effort only
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Contact Information</Text>
        <Text style={styles.subtitle}>
          Reach out to the Ganimi team for any queries, support, or feedback.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="call-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.cardTextBlock}>
              <Text style={styles.cardLabel}>Ganimi</Text>
              <TouchableOpacity onPress={() => handleCall(PHONE_GANIMI)}>
                <Text style={styles.cardValue}>{PHONE_GANIMI}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="call-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.cardTextBlock}>
              <Text style={styles.cardLabel}>ADDONS-i</Text>
              <TouchableOpacity onPress={() => handleCall(PHONE_ADDONS)}>
                <Text style={styles.cardValue}>{PHONE_ADDONS}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.availabilityWrapper}>
            <Text style={styles.availabilityText}>
              Available Monday to Friday, 9:00 AM – 6:00 PM IST.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconCircle, styles.emailIconCircle]}>
              <Ionicons name="mail-outline" size={20} color="#0284C7" />
            </View>
            <View style={styles.cardTextBlock}>
              <Text style={styles.cardLabel}>Email Support</Text>
              <TouchableOpacity onPress={handleEmail}>
                <Text style={styles.cardValue}>{EMAIL_SUPPORT}</Text>
              </TouchableOpacity>
              <Text style={styles.helperText}>
                Send us a message anytime; we aim to reply within 24 hours.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emailIconCircle: {
    backgroundColor: '#E0F2FE',
  },
  cardTextBlock: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  cardValue: {
    marginTop: 2,
    fontSize: 14,
    color: Colors.primary,
  },
  helperText: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  availabilityWrapper: {
    marginTop: 4,
  },
  availabilityText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});

