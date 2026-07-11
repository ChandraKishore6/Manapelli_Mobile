import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../lib/supabase';

interface Bureau {
  id: string;
  name: string;
  location: string | null;
  logo_url: string | null;
  about_us: string | null;
  contact_email: string;
  contact_phone: string | null;
  communities?: string[];
  profile_count?: number;
  signed_logo_url?: string | null;
}

interface Community {
  id: string;
  name: string;
}

interface WelcomeScreenProps {
  onShowMemberLogin: () => void;
  onShowBureauLogin: () => void;
  onShowMasterLogin: () => void;
  onShowRegisterProfile: () => void;
  onShowRegisterBureau: () => void;
  // Let profile registration start with preselected community/bureau
  onShowRegisterProfileWithDetails?: (communityId: string, bureauId: string) => void;
}

export default function WelcomeScreen({
  onShowMemberLogin,
  onShowBureauLogin,
  onShowMasterLogin,
  onShowRegisterProfile,
  onShowRegisterBureau,
  onShowRegisterProfileWithDetails,
}: WelcomeScreenProps) {
  const [loading, setLoading] = useState(true);
  const [statsBureaus, setStatsBureaus] = useState(0);
  const [statsCommunities, setStatsCommunities] = useState(0);
  const [statsMembers, setStatsMembers] = useState(0);

  // Browse Bureaus Flow States
  const [isBrowseVisible, setIsBrowseVisible] = useState(false);
  const [browseStep, setBrowseStep] = useState<1 | 2 | 3>(1); // 1: Select Comm, 2: Select Bureau, 3: Bureau Detail
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [loadingComms, setLoadingComms] = useState(false);
  const [selectedCommId, setSelectedCommId] = useState('');
  const [selectedCommName, setSelectedCommName] = useState('');
  const [communityBureaus, setCommunityBureaus] = useState<Bureau[]>([]);
  const [loadingBureaus, setLoadingBureaus] = useState(false);
  const [selectedBureau, setSelectedBureau] = useState<Bureau | null>(null);

  // FAQ Accordion local state
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: 'How do I register my profile?',
      a: 'Choose a community first, select a marriage bureau that serves your community, and submit your biodata. The bureau admin will verify your details manually and issue your login password.',
    },
    {
      q: 'Can I see profiles from other bureaus?',
      a: 'No. To ensure absolute discretion, you only ever see approved matches from within your own bureau and within your community.',
    },
    {
      q: 'Who can see my photos?',
      a: 'Your photos are only visible to approved, logged-in members of the same bureau who match your gender preference. Casual visitors cannot browse profiles.',
    },
    {
      q: 'I run a marriage bureau. How do I join?',
      a: 'You can apply to host your bureau by tapping "Register a Bureau" under our Portals or at the bottom of the screen. The platform master admin will review and approve your application.',
    },
  ];

  // Fetch stats count on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: bureausData } = await supabase.rpc('list_public_bureaus');
        const { data: commsData } = await supabase.rpc('list_communities');

        if (commsData) {
          setStatsCommunities(commsData.length);
        }
        if (bureausData) {
          setStatsBureaus(bureausData.length);
          const totalMembers = bureausData.reduce((sum: number, b: any) => sum + Number(b.profile_count || 0), 0);
          setStatsMembers(totalMembers);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleOpenBrowse = async () => {
    setIsBrowseVisible(true);
    setBrowseStep(1);
    setSelectedCommId('');
    setSelectedCommName('');
    setSelectedBureau(null);
    setLoadingComms(true);
    try {
      const { data, error } = await supabase.rpc('list_communities');
      if (data) {
        setAllCommunities(data as Community[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComms(false);
    }
  };

  const handleSelectCommunity = async (commId: string, commName: string) => {
    setSelectedCommId(commId);
    setSelectedCommName(commName);
    setBrowseStep(2);
    setLoadingBureaus(true);
    setCommunityBureaus([]);
    try {
      const { data, error } = await supabase.rpc('list_public_bureaus_by_community', {
        _community_id: commId,
      });

      if (data) {
        // Fetch signed urls for logo icons
        const logoPaths = data.map((b: any) => b.logo_url).filter((p: any) => !!p);
        if (logoPaths.length > 0) {
          const { data: signedData } = await supabase.storage
            .from('bureau-logos')
            .createSignedUrls(logoPaths, 3600);

          const urlMap = new Map<string, string>();
          if (signedData) {
            signedData.forEach((item) => {
              if (item.signedUrl && item.path) urlMap.set(item.path, item.signedUrl);
            });
          }

          const mapped = data.map((b: any) => ({
            ...b,
            signed_logo_url: b.logo_url ? urlMap.get(b.logo_url) || null : null,
          }));
          setCommunityBureaus(mapped);
        } else {
          setCommunityBureaus(data as Bureau[]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBureaus(false);
    }
  };

  const handleSelectBureau = async (bureau: Bureau) => {
    setSelectedBureau(bureau);
    setBrowseStep(3);
  };

  const handleApplyToBureau = () => {
    if (selectedBureau && selectedCommId) {
      setIsBrowseVisible(false);
      if (onShowRegisterProfileWithDetails) {
        onShowRegisterProfileWithDetails(selectedCommId, selectedBureau.id);
      } else {
        onShowRegisterProfile();
      }
    }
  };

  const toggleFaq = (index: number) => {
    setExpandedFaqIndex(expandedFaqIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heartBadge}>
            <Text style={styles.heartIcon}>❦</Text>
          </View>
          <Text style={styles.titleText}>ManaPelli</Text>
          <Text style={styles.taglineText}>మన పెళ్లి · Our Wedding</Text>
          <Text style={styles.heroTitle}>Sacred matches, made through trusted bureaus.</Text>
        </View>

        {/* Stats Pills Row */}
        <View style={styles.statsPillRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>🏢 {statsBureaus} Bureaus</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>🌿 {statsCommunities} Castes</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>👥 {statsMembers} Members</Text>
          </View>
        </View>

        {/* Separate Browse Bureaus Card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <TouchableOpacity style={styles.browseBureausCardBtn} onPress={handleOpenBrowse}>
            <View style={styles.browseIconWrapper}>
              <Text style={styles.browseIcon}>🔍</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.browseTitle}>Browse Live Bureaus</Text>
              <Text style={styles.browseSubtitle}>Find active marriage bureaus by caste</Text>
            </View>
            <Text style={styles.browseArrow}>→</Text>
          </TouchableOpacity>
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
                <Text style={styles.hubSubtitleMember}>Create a profile & view community matches</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.hubPrimaryBtnMember} onPress={onShowRegisterProfile}>
              <Text style={styles.hubPrimaryBtnTextMember}>Create Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.hubSecondaryBtnMember} onPress={onShowMemberLogin}>
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
                <Text style={styles.hubSubtitleBureau}>Manage your members & credentials</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.hubPrimaryBtnBureau} onPress={onShowBureauLogin}>
              <Text style={styles.hubPrimaryBtnTextBureau}>Sign In as Bureau</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.hubSecondaryBtnBureau} onPress={onShowRegisterBureau}>
              <Text style={styles.hubSecondaryBtnTextBureau}>Register your Bureau →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqList}>
            {faqs.map((faq, idx) => (
              <View key={idx} style={styles.faqItem}>
                <TouchableOpacity style={styles.faqHeader} onPress={() => toggleFaq(idx)} activeOpacity={0.7}>
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                  <Text style={styles.faqArrow}>{expandedFaqIndex === idx ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {expandedFaqIndex === idx && (
                  <View style={styles.faqBody}>
                    <Text style={styles.faqAnswer}>{faq.a}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>ManaPelli Matrimony</Text>
          <Text style={styles.footerText}>© 2026. All bureaus are independently operated.</Text>
        </View>
      </ScrollView>

      {/* Browse Bureaus Wizard Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isBrowseVisible}
        onRequestClose={() => setIsBrowseVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Browse Live Bureaus</Text>
                {browseStep > 1 && (
                  <TouchableOpacity
                    style={styles.modalBackBtn}
                    onPress={() => setBrowseStep((prev) => (prev - 1) as any)}
                  >
                    <Text style={styles.modalBackText}>← Back to {browseStep === 2 ? 'Castes' : 'Bureaus'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={() => setIsBrowseVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Step 1: Select Caste */}
              {browseStep === 1 && (
                <View>
                  <Text style={styles.modalSubtitle}>Select your community caste first:</Text>
                  {loadingComms ? (
                    <ActivityIndicator size="large" color="#8B1E3F" style={{ marginVertical: 40 }} />
                  ) : (
                    <View style={styles.commGrid}>
                      {allCommunities.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={styles.commChip}
                          onPress={() => handleSelectCommunity(c.id, c.name)}
                        >
                          <Text style={styles.commChipText}>{c.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Step 2: Show Bureaus serving this community */}
              {browseStep === 2 && (
                <View>
                  <Text style={styles.modalSubtitle}>Bureaus serving {selectedCommName}:</Text>
                  {loadingBureaus ? (
                    <ActivityIndicator size="large" color="#8B1E3F" style={{ marginVertical: 40 }} />
                  ) : communityBureaus.length === 0 ? (
                    <Text style={styles.noBureausText}>No active bureaus serve this community yet.</Text>
                  ) : (
                    <View style={styles.bureauList}>
                      {communityBureaus.map((b) => (
                        <TouchableOpacity
                          key={b.id}
                          style={styles.bureauItem}
                          onPress={() => handleSelectBureau(b)}
                        >
                          <View style={styles.bureauRow}>
                            {b.signed_logo_url ? (
                              <Image source={{ uri: b.signed_logo_url }} style={styles.bureauLogo} />
                            ) : (
                              <View style={styles.bureauLogoPlaceholder}>
                                <Text>🏢</Text>
                              </View>
                            )}
                            <View style={styles.bureauMeta}>
                              <Text style={styles.bureauName}>{b.name}</Text>
                              <Text style={styles.bureauLocation}>📍 {b.location || 'South India'}</Text>
                              <Text style={styles.bureauProfileCount}>
                                👥 {b.profile_count || 0} Registered in {selectedCommName}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Step 3: Show Bureau Details */}
              {browseStep === 3 && selectedBureau && (
                <View style={styles.bureauDetailBox}>
                  <View style={styles.bureauDetailHeader}>
                    {selectedBureau.signed_logo_url ? (
                      <Image source={{ uri: selectedBureau.signed_logo_url }} style={styles.bureauDetailLogo} />
                    ) : (
                      <View style={styles.bureauDetailLogoPlaceholder}>
                        <Text style={{ fontSize: 32 }}>🏢</Text>
                      </View>
                    )}
                    <Text style={styles.bureauDetailName}>{selectedBureau.name}</Text>
                    <Text style={styles.bureauDetailLoc}>📍 {selectedBureau.location || 'South India'}</Text>
                  </View>

                  <Text style={styles.detailLabel}>Active Profiles</Text>
                  <Text style={styles.detailText}>
                    👥 {selectedBureau.profile_count || 0} human-verified profiles registered for {selectedCommName}
                  </Text>

                  <Text style={styles.detailLabel}>About Us</Text>
                  <Text style={styles.detailText}>{selectedBureau.about_us || 'No description provided.'}</Text>

                  <Text style={styles.detailLabel}>Contact Details</Text>
                  <Text style={styles.detailText}>✉️ {selectedBureau.contact_email}</Text>
                  {selectedBureau.contact_phone && (
                    <Text style={[styles.detailText, { marginTop: 4 }]}>📞 {selectedBureau.contact_phone}</Text>
                  )}

                  <TouchableOpacity style={styles.modalApplyBtn} onPress={handleApplyToBureau}>
                    <Text style={styles.modalApplyBtnText}>Apply to join {selectedBureau.name}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingTop: 36,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  heartBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B1E3F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#8B1E3F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  heartIcon: {
    fontSize: 28,
    color: '#F4E8D1',
  },
  titleText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C1B1F',
  },
  taglineText: {
    fontSize: 10,
    color: '#8B1E3F',
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 18,
    fontWeight: '600',
    color: '#706064',
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 16,
    paddingHorizontal: 12,
  },
  statsPillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statPill: {
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B1E3F',
  },
  hubsContainer: {
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 24,
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
    marginBottom: 20,
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
    fontSize: 12,
    color: '#D4B8BE',
    marginTop: 2,
  },
  hubTitleBureau: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C1B1F',
  },
  hubSubtitleBureau: {
    fontSize: 12,
    color: '#706064',
    marginTop: 2,
  },
  hubPrimaryBtnMember: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  hubPrimaryBtnTextMember: {
    color: '#3E1520',
    fontSize: 15,
    fontWeight: '600',
  },
  hubSecondaryBtnMember: {
    marginTop: 14,
    alignItems: 'center',
  },
  hubSecondaryBtnTextMember: {
    color: '#F4E8D1',
    fontSize: 13,
    fontWeight: '600',
  },
  hubPrimaryBtnBureau: {
    height: 48,
    backgroundColor: '#8B1E3F',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B1E3F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  hubPrimaryBtnTextBureau: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  hubSecondaryBtnBureau: {
    marginTop: 14,
    alignItems: 'center',
  },
  hubSecondaryBtnTextBureau: {
    color: '#8B1E3F',
    fontSize: 13,
    fontWeight: '600',
  },
  bureauAdminLoginLink: {
    marginTop: 18,
    paddingVertical: 8,
    alignItems: 'center',
  },
  bureauAdminLoginLinkText: {
    color: '#8B1E3F',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  browseBureausCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EFEAE2',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
    shadowColor: '#2C1B1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  browseIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FDF7F8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F6E6E8',
  },
  browseIcon: {
    fontSize: 22,
  },
  browseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C1B1F',
  },
  browseSubtitle: {
    fontSize: 12,
    color: '#706064',
    marginTop: 2,
  },
  browseArrow: {
    fontSize: 18,
    color: '#8B1E3F',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: '#2C1B1F',
    textAlign: 'center',
    marginBottom: 16,
  },
  faqSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
  },
  faqList: {
    gap: 12,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C1B1F',
    flex: 1,
    paddingRight: 10,
  },
  faqArrow: {
    fontSize: 10,
    color: '#998E90',
  },
  faqBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#FAF8F5',
  },
  faqAnswer: {
    fontSize: 13,
    color: '#706064',
    lineHeight: 20,
    marginTop: 10,
  },
  footer: {
    paddingVertical: 32,
    backgroundColor: '#FAF5EE',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
  },
  footerLogo: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C1B1F',
  },
  footerText: {
    fontSize: 12,
    color: '#998E90',
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 22,
    fontWeight: '700',
    color: '#2C1B1F',
  },
  modalBackBtn: {
    marginTop: 6,
  },
  modalBackText: {
    fontSize: 13,
    color: '#8B1E3F',
    fontWeight: '600',
  },
  closeBtn: {
    fontSize: 20,
    color: '#706064',
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#706064',
    marginBottom: 16,
    fontWeight: '500',
  },
  modalScroll: {
    marginBottom: 24,
  },
  commGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  commChip: {
    backgroundColor: '#FCFAF6',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
  },
  commChipText: {
    fontSize: 14,
    color: '#2C1B1F',
    fontWeight: '500',
  },
  bureauList: {
    gap: 12,
  },
  bureauItem: {
    backgroundColor: '#FCFAF6',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    borderRadius: 16,
    padding: 16,
  },
  bureauRow: {
    flexDirection: 'row',
    gap: 14,
  },
  bureauLogo: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  bureauLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#EFEAE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bureauMeta: {
    flex: 1,
  },
  bureauName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C1B1F',
  },
  bureauLocation: {
    fontSize: 12,
    color: '#706064',
    marginTop: 4,
  },
  bureauProfileCount: {
    fontSize: 11,
    color: '#8B1E3F',
    fontWeight: '600',
    marginTop: 6,
  },
  noBureausText: {
    fontSize: 14,
    color: '#998E90',
    textAlign: 'center',
    marginVertical: 40,
  },
  bureauDetailBox: {
    paddingVertical: 10,
  },
  bureauDetailHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  bureauDetailLogo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 12,
  },
  bureauDetailLogoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#FCFAF6',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bureauDetailName: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: '#2C1B1F',
    textAlign: 'center',
  },
  bureauDetailLoc: {
    fontSize: 13,
    color: '#706064',
    marginTop: 6,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#998E90',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#2C1B1F',
    lineHeight: 20,
  },
  modalApplyBtn: {
    height: 50,
    backgroundColor: '#8B1E3F',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
  },
  modalApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
