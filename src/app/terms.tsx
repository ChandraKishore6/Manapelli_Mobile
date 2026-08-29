import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.title}>Terms of Service (EULA)</Text>
          <Text style={styles.dateText}>Last updated: August 2026</Text>

          <Text style={styles.sectionHeader}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By creating an account or registering with ManaPelli Matrimony, you agree to comply with these Terms of Service. If you do not agree, you must not use our service.
          </Text>

          <Text style={styles.sectionHeader}>2. Zero Tolerance Policy for Objectionable Content</Text>
          <Text style={styles.paragraph}>
            ManaPelli enforces a strict zero-tolerance policy against abusive, harassing, inappropriate, or fraudulent user behavior. Any user account posting objectionable content or impersonating others will be ejected and permanently terminated immediately.
          </Text>

          <Text style={styles.sectionHeader}>3. User-Generated Content Moderation</Text>
          <Text style={styles.paragraph}>
            Users have the ability to report profiles and block abusive candidates. Reported content is reviewed by our administration team within 24 hours for appropriate action.
          </Text>

          <Text style={styles.sectionHeader}>4. Authenticity & Verification</Text>
          <Text style={styles.paragraph}>
            All candidate profiles submitted through partner marriage bureaus undergo peer verification to maintain profile authenticity and candidate trust.
          </Text>

          <Text style={styles.sectionHeader}>5. Contact Support</Text>
          <Text style={styles.paragraph}>
            If you have questions regarding these terms, reach out to our legal and support team at support@manapelli.in.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  scrollContent: {
    padding: 16,
  },
  backBtn: {
    marginBottom: 16,
  },
  backBtnText: {
    fontSize: 16,
    color: '#8B1E3F',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C1B1F',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#706064',
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B1E3F',
    marginTop: 14,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    color: '#706064',
    lineHeight: 22,
  },
});
