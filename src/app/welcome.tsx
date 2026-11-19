import React from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface WelcomeScreenProps {
  onShowMemberLogin: () => void;
  onShowBureauLogin: () => void;
  onShowMasterLogin: () => void;
  onShowRegisterProfile: () => void;
  onShowRegisterBureau: () => void;
  onShowRegisterProfileWithDetails?: (communityId: string, bureauId: string) => void;
}

export default function WelcomeScreen({
  onShowMemberLogin,
  onShowBureauLogin,
  onShowMasterLogin,
  onShowRegisterProfile,
  onShowRegisterBureau,
}: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();

  const handleOpenPrivacy = () => {
    Linking.openURL('https://manapelli.in/privacy').catch((err) =>
      console.error('Failed to open privacy link:', err)
    );
  };

  const handleOpenTerms = () => {
    Linking.openURL('https://manapelli.in/terms').catch((err) =>
      console.error('Failed to open terms link:', err)
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 30, 60) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heartBadge}>
            <Text style={styles.heartIcon}>❦</Text>
          </View>
          <Text style={styles.titleText}>ManaPelli</Text>
          <Text style={styles.taglineText}>మన పెళ్లి · Our Wedding</Text>
          <Text style={styles.heroTitle}>Sacred matches, made through trusted bureaus.</Text>
        </View>

        {/* Action Hubs */}
        <View style={styles.hubsContainer}>
          {/* Member Hub Card */}
          <View style={styles.hubCardMember}>
            <View style={styles.hubHeader}>
              <View style={styles.hubIconWrapperMember}>
                <Text style={styles.hubIcon}>👤</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hubTitleMember}>Brides & Grooms</Text>
                <Text style={styles.hubSubtitleMember}>
                  Create a profile & view community matches
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.hubPrimaryBtnMember}
              onPress={onShowRegisterProfile}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            >
              <Text style={styles.hubPrimaryBtnTextMember}>Create Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.hubSecondaryBtnMember}
              onPress={onShowMemberLogin}
              activeOpacity={0.8}
              hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            >
              <Text style={styles.hubSecondaryBtnTextMember}>Sign In to Account →</Text>
            </TouchableOpacity>
          </View>

          {/* Bureau Hub Card */}
          <View style={styles.hubCardBureau}>
            <View style={styles.hubHeader}>
              <View style={styles.hubIconWrapperBureau}>
                <Text style={styles.hubIcon}>🏢</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hubTitleBureau}>Marriage Bureaus</Text>
                <Text style={styles.hubSubtitleBureau}>
                  Manage your members & credentials
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.hubPrimaryBtnBureau}
              onPress={onShowBureauLogin}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            >
              <Text style={styles.hubPrimaryBtnTextBureau}>Sign In as Bureau</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.hubSecondaryBtnBureau}
              onPress={onShowRegisterBureau}
              activeOpacity={0.8}
              hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            >
              <Text style={styles.hubSecondaryBtnTextBureau}>Register your Bureau →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>ManaPelli Matrimony</Text>
          <View style={styles.footerLinksRow}>
            <TouchableOpacity
              onPress={handleOpenPrivacy}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.footerLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.footerBullet}>•</Text>
            <TouchableOpacity
              onPress={handleOpenTerms}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.footerLinkText}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerText}>© 2026. All bureaus are independently operated.</Text>

          {/* Master Admin Portal discreet link */}
          <TouchableOpacity
            style={styles.masterAdminLink}
            onPress={onShowMasterLogin}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.masterAdminText}>Master Administration</Text>
          </TouchableOpacity>
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
    flexGrow: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 28,
  },
  heartBadge: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: '#8B1E3F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#8B1E3F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  heartIcon: {
    fontSize: 34,
    color: '#F4E8D1',
  },
  titleText: {
    fontSize: 38,
    fontWeight: '800',
    color: '#8B1E3F',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -0.5,
  },
  taglineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4AF37',
    marginTop: 6,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#706064',
    textAlign: 'center',
    lineHeight: 25,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  hubsContainer: {
    paddingHorizontal: 20,
    gap: 18,
    marginBottom: 32,
  },
  hubCardMember: {
    backgroundColor: '#3E1520',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#2C1B1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  hubCardBureau: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    shadowColor: '#2C1B1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  hubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 22,
  },
  hubIconWrapperMember: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubIconWrapperBureau: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FAF5EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  hubIcon: {
    fontSize: 22,
  },
  hubTitleMember: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hubSubtitleMember: {
    fontSize: 13,
    color: '#D4B8BE',
    marginTop: 3,
  },
  hubTitleBureau: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C1B1F',
  },
  hubSubtitleBureau: {
    fontSize: 13,
    color: '#706064',
    marginTop: 3,
  },
  // Generous, easily clickable buttons with full touch target sizing
  hubPrimaryBtnMember: {
    height: 52,
    backgroundColor: '#FAF7F2',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubPrimaryBtnTextMember: {
    color: '#3E1520',
    fontSize: 16,
    fontWeight: '700',
  },
  hubSecondaryBtnMember: {
    height: 50,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubSecondaryBtnTextMember: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  hubPrimaryBtnBureau: {
    height: 52,
    backgroundColor: '#8B1E3F',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B1E3F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  hubPrimaryBtnTextBureau: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  hubSecondaryBtnBureau: {
    height: 50,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#8B1E3F',
    backgroundColor: '#FAF5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubSecondaryBtnTextBureau: {
    color: '#8B1E3F',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  footerLogo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8B1E3F',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 10,
  },
  footerLinkText: {
    color: '#8B1E3F',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footerBullet: {
    color: '#998E90',
  },
  footerText: {
    fontSize: 11,
    color: '#998E90',
    textAlign: 'center',
  },
  masterAdminLink: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  masterAdminText: {
    fontSize: 11,
    color: '#B5A8A9',
    textDecorationLine: 'underline',
  },
});
