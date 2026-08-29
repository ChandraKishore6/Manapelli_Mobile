import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.dateText}>Last updated: August 2026</Text>

          <Text style={styles.sectionHeader}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            ManaPelli Matrimony collects personal details provided directly by candidates and authorized marriage bureaus, including full name, date of birth, gender, profession, income, location, community, contact email, phone number, and uploaded profile photographs.
          </Text>

          <Text style={styles.sectionHeader}>2. How Information is Used</Text>
          <Text style={styles.paragraph}>
            Your profile details are utilized strictly for matchmaking, peer verification, community list matching, and facilitating authorized communication between registered candidates and verified marriage bureaus.
          </Text>

          <Text style={styles.sectionHeader}>3. Data Protection & Watermarking</Text>
          <Text style={styles.paragraph}>
            Uploaded candidate images are automatically protected with secure digital watermarks (ManaPelli ❤️) to prevent unauthorized photo downloading, duplication, or misuse.
          </Text>

          <Text style={styles.sectionHeader}>4. Account Deletion & Data Removal</Text>
          <Text style={styles.paragraph}>
            Candidates and Bureau Admins can permanently delete their accounts at any time from within the app settings. Deletion permanently purges all profile records, uploaded photographs, and login credentials from our database.
          </Text>

          <Text style={styles.sectionHeader}>5. Contact Us</Text>
          <Text style={styles.paragraph}>
            For privacy inquiries or support requests, please contact our privacy compliance team at support@manapelli.in.
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
