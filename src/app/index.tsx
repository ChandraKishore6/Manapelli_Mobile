import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getCachedSignedUrls } from '../lib/photoCache';
import { SupportModal } from '../components/support-modal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const cardWidth = SCREEN_WIDTH - 32;

export interface MatchProfile {
  id: string;
  full_name: string;
  dob: string;
  gender: string;
  occupation: string | null;
  current_place: string | null;
  native_place: string | null;
  community: string | null;
  salary: number | null;
  salary_currency: string;
  cover_image_path: string | null;
  image_paths?: string[];
  signed_images?: string[];
  signed_cover_url?: string | null;
  bureau_id: string;
  is_home_bureau?: boolean;
  bureau: {
    name: string;
  };
}

interface HomeScreenProps {
  onViewProfile?: (profileId: string) => void;
}

export function MatchCard({
  item,
  onPress,
  calculateAge,
  formatSalary,
  isFavorite = false,
  onToggleFavorite,
  onExpressInterest,
  onSendMessage,
  interestStatus,
}: {
  item: MatchProfile;
  onPress: () => void;
  calculateAge: (dobString: string) => number;
  formatSalary: (salary: number | null, currency: string) => string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onExpressInterest?: () => void;
  onSendMessage?: () => void;
  interestStatus?: 'pending' | 'accepted' | 'declined' | null;
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const displayedImages = item.signed_images && item.signed_images.length > 0
    ? item.signed_images
    : (item.signed_cover_url ? [item.signed_cover_url] : []);

  const handleNextPhoto = (e: any) => {
    e.stopPropagation();
    if (activeImageIndex < displayedImages.length - 1) {
      const nextIdx = activeImageIndex + 1;
      setActiveImageIndex(nextIdx);
      scrollViewRef.current?.scrollTo({ x: nextIdx * cardWidth, animated: true });
    }
  };

  const handlePrevPhoto = (e: any) => {
    e.stopPropagation();
    if (activeImageIndex > 0) {
      const prevIdx = activeImageIndex - 1;
      setActiveImageIndex(prevIdx);
      scrollViewRef.current?.scrollTo({ x: prevIdx * cardWidth, animated: true });
    }
  };

  return (
    <View style={styles.card}>
      {/* Photo Carousel Container */}
      <View style={styles.cardImageContainer}>
        {displayedImages.length > 0 ? (
          <View style={{ position: 'relative', width: '100%', height: 220 }}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => {
                const slideSize = event.nativeEvent.layoutMeasurement.width;
                if (slideSize > 0) {
                  const index = event.nativeEvent.contentOffset.x / slideSize;
                  setActiveImageIndex(Math.round(index));
                }
              }}
              scrollEventThrottle={200}
            >
              {displayedImages.map((url, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.92}
                  onPress={onPress}
                  style={{ width: cardWidth, height: 220 }}
                >
                  <Image
                    source={{ uri: url }}
                    style={styles.cardImage}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Prev / Next Photo Overlay Arrows */}
            {displayedImages.length > 1 && (
              <>
                {activeImageIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.arrowOverlay, styles.leftArrow]}
                    onPress={handlePrevPhoto}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.arrowText}>‹</Text>
                  </TouchableOpacity>
                )}
                {activeImageIndex < displayedImages.length - 1 && (
                  <TouchableOpacity
                    style={[styles.arrowOverlay, styles.rightArrow]}
                    onPress={handleNextPhoto}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.arrowText}>›</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Pagination Dots */}
            {displayedImages.length > 1 && (
              <View style={styles.paginationContainer}>
                {displayedImages.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.paginationDot,
                      i === activeImageIndex ? styles.activeDot : styles.inactiveDot,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={onPress}
            style={[styles.cardImage, styles.placeholderImage]}
          >
            <Text style={styles.placeholderIcon}>❦</Text>
          </TouchableOpacity>
        )}

        {/* Top Badges: Community Pill (Left) & Favorite Heart Button (Right) */}
        <View style={styles.communityTag}>
          <Text style={styles.communityTagText}>{item.community || 'Community'}</Text>
        </View>

        {onToggleFavorite && (
          <TouchableOpacity
            style={styles.heartButton}
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.heartIconText}>{isFavorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        )}

        {/* Bureau Verification Badge Overlay on Image Bottom Left */}
        <View style={styles.verifiedBadgeOverlay}>
          <Text style={styles.verifiedBadgeText}>
            🛡️ {item.bureau?.name || 'Bureau Verified'}
            {!item.is_home_bureau && ' · Partner'}
          </Text>
        </View>
      </View>

      {/* Card Content & Details */}
      <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={styles.cardDetails}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.cardName}>
            {item.full_name}, <Text style={styles.cardAge}>{calculateAge(item.dob)}</Text>
          </Text>
          {!item.is_home_bureau && (
            <View style={styles.partnerBadge}>
              <Text style={styles.partnerBadgeText}>🌐 Cross-Bureau</Text>
            </View>
          )}
        </View>

        <Text style={styles.cardSub}>
          💼 {item.occupation || 'Private Service'}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Lives in</Text>
            <Text style={styles.metaValue} numberOfLines={1}>📍 {item.current_place || 'Not specified'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Native Place</Text>
            <Text style={styles.metaValue} numberOfLines={1}>🏡 {item.native_place || 'Not specified'}</Text>
          </View>
        </View>

        <View style={styles.salaryContainer}>
          <Text style={styles.salaryLabel}>Annual Income</Text>
          <Text style={styles.salaryValue}>
            💰 {formatSalary(item.salary, item.salary_currency)}
          </Text>
        </View>

        {/* Dual Primary Action Buttons: Express Interest & Send Message */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={[
              styles.cardActionBtn,
              interestStatus === 'accepted'
                ? styles.cardActionAccepted
                : interestStatus === 'pending'
                ? styles.cardActionPending
                : styles.cardActionInterest,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              if (onExpressInterest) onExpressInterest();
            }}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.cardActionBtnText,
                interestStatus === 'accepted'
                  ? styles.cardActionAcceptedText
                  : interestStatus === 'pending'
                  ? styles.cardActionPendingText
                  : styles.cardActionInterestText,
              ]}
            >
              {interestStatus === 'accepted'
                ? '🎉 Connected'
                : interestStatus === 'pending'
                ? '⏳ Interest Sent'
                : '💖 Express Interest'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardActionBtn, styles.cardActionChat]}
            onPress={(e) => {
              e.stopPropagation();
              if (onSendMessage) onSendMessage();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.cardActionChatText}>💬 Send Message</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}

interface HomeScreenProps {
  onViewProfile?: (profileId: string) => void;
  onOpenInterests?: () => void;
  onOpenChats?: () => void;
  onOpenViews?: () => void;
  onOpenChat?: (peerProfileId: string) => void;
}

export default function HomeScreen({ onViewProfile, onOpenInterests, onOpenChats, onOpenViews, onOpenChat }: HomeScreenProps) {
  const { profile, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const handleOpenInterests = onOpenInterests || (() => router.push('/interests' as any));
  const handleOpenChats = onOpenChats || (() => router.push('/chats' as any));
  const handleOpenViews = onOpenViews || (() => router.push('/views' as any));
  const handleOpenChat = onOpenChat || ((id: string) => router.push(`/chat/${id}` as any));
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [favoritesList, setFavoritesList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bureauName, setBureauName] = useState('My Bureau');
  const [supportVisible, setSupportVisible] = useState(false);
  const [pendingInterestsCount, setPendingInterestsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);

  const fetchSocialSummary = async () => {
    if (!profile) return;
    try {
      // 1. Incoming pending interests count
      const { count: pendingCount } = await supabase
        .from('interests')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_profile_id', profile.id)
        .eq('status', 'pending');

      setPendingInterestsCount(pendingCount || 0);

      // 2. Unread messages count
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_user_id', profile.user_id)
        .eq('is_read', false);

      setUnreadMessagesCount(unreadCount || 0);

      // 3. Profile views count
      const { count: vCount } = await supabase
        .from('profile_views')
        .select('id', { count: 'exact', head: true })
        .eq('viewed_profile_id', profile.id);

      setViewsCount(vCount || 0);
    } catch (err) {
      console.error('Error fetching social summary:', err);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of ManaPelli?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleCardPress = (id: string) => {
    if (onViewProfile) {
      onViewProfile(id);
    } else {
      router.push(`/profile/${id}`);
    }
  };

  const fetchBureauDetails = async (bureauId: string) => {
    try {
      const { data, error } = await supabase
        .from('bureaus')
        .select('name')
        .eq('id', bureauId)
        .single();
      if (data) {
        setBureauName(data.name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFavorites = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('profile_id')
        .eq('user_id', profile.user_id);
      if (error) {
        console.error('Error fetching favorites:', error.message);
      } else if (data) {
        setFavoritesList(data.map((f) => f.profile_id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFavorite = async (profileId: string) => {
    if (!profile) return;
    const isFav = favoritesList.includes(profileId);
    try {
      if (isFav) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', profile.user_id)
          .eq('profile_id', profileId);
        if (error) {
          Alert.alert('Error', error.message);
        } else {
          setFavoritesList((prev) => prev.filter((id) => id !== profileId));
        }
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: profile.user_id,
            profile_id: profileId,
          });
        if (error) {
          Alert.alert('Error', error.message);
        } else {
          setFavoritesList((prev) => [...prev, profileId]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [bureauFilter, setBureauFilter] = useState<'all' | 'home'>('all');
  const [interestsMap, setInterestsMap] = useState<Record<string, 'pending' | 'accepted' | 'declined'>>({});

  const fetchInterestsMap = async () => {
    if (!profile?.id) return;
    try {
      const { data } = await supabase
        .from('interests')
        .select('id, status, sender_profile_id, receiver_profile_id')
        .or(`sender_profile_id.eq.${profile.id},receiver_profile_id.eq.${profile.id}`);

      if (data) {
        const map: Record<string, 'pending' | 'accepted' | 'declined'> = {};
        data.forEach((row: any) => {
          const peerId = row.sender_profile_id === profile.id ? row.receiver_profile_id : row.sender_profile_id;
          map[peerId] = row.status;
        });
        setInterestsMap(map);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExpressInterest = async (targetProfileId: string) => {
    if (!profile?.id) return;
    try {
      const currentStatus = interestsMap[targetProfileId];
      if (currentStatus) {
        Alert.alert('Info', currentStatus === 'accepted' ? 'You are already connected!' : 'Interest request already sent.');
        return;
      }

      const { error } = await supabase.from('interests').insert({
        sender_profile_id: profile.id,
        receiver_profile_id: targetProfileId,
        status: 'pending',
      });

      if (error) throw error;
      Alert.alert('Success 🎉', 'Interest expressed successfully!');
      setInterestsMap((prev) => ({ ...prev, [targetProfileId]: 'pending' }));
      fetchSocialSummary();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not express interest.');
    }
  };

  const fetchMatches = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Call SECURITY DEFINER RPC to bypass RLS securely for cross-bureau matches
      const { data: rawMatches, error: rpcError } = await supabase.rpc('list_visible_matches');

      if (rpcError) {
        console.error('Error fetching visible matches:', rpcError.message);
      }

      const matchData = rawMatches || [];

      // Pre-fetch 24h photo URLs
      const paths = matchData.map((p: any) => p.cover_image_path);
      const urlMap = await getCachedSignedUrls(paths);

      const parsedMatches: MatchProfile[] = matchData.map((m: any) => ({
        id: m.id,
        full_name: m.full_name || 'Candidate',
        dob: m.dob,
        gender: m.gender,
        occupation: m.occupation,
        current_place: m.current_place,
        native_place: m.native_place,
        community: m.community,
        salary: m.salary,
        salary_currency: m.salary_currency || 'INR',
        cover_image_path: m.cover_image_path,
        signed_cover_url: m.cover_image_path ? urlMap[m.cover_image_path] || null : null,
        bureau_id: m.bureau_id,
        is_home_bureau: m.is_home_bureau,
        bureau: {
          name: m.bureau_name || 'Independent Bureau',
        },
      }));

      setMatches(parsedMatches);
      fetchInterestsMap();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchBureauDetails(profile.bureau_id);
      fetchFavorites();
      fetchMatches();
      fetchSocialSummary();
    }
  }, [profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchFavorites(), fetchMatches(), fetchSocialSummary()]);
    setRefreshing(false);
  };

  const calculateAge = (dobString: string) => {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatSalary = (salary: number | null, currency: string) => {
    if (!salary) return 'Not Specified';
    const amount = Number(salary);
    if (amount >= 100000) {
      const lakhs = amount / 100000;
      return `${currency} ${lakhs.toFixed(1)} Lakhs/yr`;
    }
    return `${currency} ${amount.toLocaleString()}/yr`;
  };

  if (authLoading || (loading && matches.length === 0)) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B1E3F" />
      </View>
    );
  }

  // Handle Pending / Rejected profiles
  if (profile && profile.status !== 'approved') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.statusContentContainer}>
          <View style={styles.statusHeartBadge}>
            <Text style={styles.statusHeartIcon}>❦</Text>
          </View>
          <Text style={styles.bureauHeader}>{bureauName}</Text>
          
          <View style={styles.statusCard}>
            {profile.status === 'pending' ? (
              <>
                <Text style={styles.statusTitle}>Profile Verification Pending</Text>
                <Text style={styles.statusDescription}>
                  Thank you for submitting your details. The bureau team is currently reviewing your profile.
                </Text>
                <View style={styles.statusAlert}>
                  <Text style={styles.statusAlertText}>
                    Our typical verification takes under 24 hours. Once approved, you will see all matching verified profiles from your community here.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.statusTitle, { color: '#B23B3B' }]}>Profile Rejected</Text>
                <Text style={styles.statusDescription}>
                  Your profile could not be approved by the bureau admin.
                </Text>
                {profile.rejection_reason && (
                  <View style={[styles.statusAlert, { backgroundColor: '#FDF5F5', borderColor: '#F5C6C6' }]}>
                    <Text style={[styles.statusAlertText, { color: '#B23B3B' }]}>
                      Reason: {profile.rejection_reason}
                    </Text>
                  </View>
                )}
              </>
            )}
            
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>For assistance, contact support:</Text>
              <Text style={styles.contactEmail}>support@manapelli.in</Text>
              
              <TouchableOpacity
                style={styles.supportBtn}
                onPress={() => setSupportVisible(true)}
              >
                <Text style={styles.supportBtnText}>Contact Support Form</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <SupportModal
          visible={supportVisible}
          onClose={() => setSupportVisible(false)}
          prefilledName={profile.full_name || ''}
          prefilledEmail={profile.email || ''}
          prefilledPhone={profile.phone || ''}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.logoText}>ManaPelli</Text>
          <Text style={{ fontSize: 16 }}>❤️</Text>
          <View style={styles.bureauBadge}>
            <Text style={styles.bureauBadgeText} numberOfLines={1}>{bureauName}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutHeaderBtn} activeOpacity={0.8}>
          <Text style={styles.signOutHeaderText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Navigation Action Row */}
      <View style={styles.quickNavRow}>
        <TouchableOpacity style={styles.quickNavBtn} onPress={handleOpenInterests} activeOpacity={0.8}>
          <Text style={styles.quickNavIcon}>📩</Text>
          <Text style={styles.quickNavText}>Interests</Text>
          {pendingInterestsCount > 0 && (
            <View style={styles.quickNavBadge}>
              <Text style={styles.quickNavBadgeText}>{pendingInterestsCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickNavBtn} onPress={handleOpenChats} activeOpacity={0.8}>
          <Text style={styles.quickNavIcon}>💬</Text>
          <Text style={styles.quickNavText}>Chats</Text>
          {unreadMessagesCount > 0 && (
            <View style={styles.quickNavBadge}>
              <Text style={styles.quickNavBadgeText}>{unreadMessagesCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickNavBtn} onPress={handleOpenViews} activeOpacity={0.8}>
          <Text style={styles.quickNavIcon}>👁️</Text>
          <Text style={styles.quickNavText}>Views</Text>
          {viewsCount > 0 && (
            <View style={styles.quickNavBadgeSecondary}>
              <Text style={styles.quickNavBadgeText}>{viewsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Horizontal Filter Pill Chips Bar */}
      <View style={styles.filterToggleRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={[styles.filterToggleBtn, bureauFilter === 'all' && styles.filterToggleBtnActive]}
            onPress={() => setBureauFilter('all')}
            activeOpacity={0.85}
          >
            <Text style={[styles.filterToggleText, bureauFilter === 'all' && styles.filterToggleTextActive]}>
              🌐 All Community ({matches.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterToggleBtn, bureauFilter === 'home' && styles.filterToggleBtnActive]}
            onPress={() => setBureauFilter('home')}
            activeOpacity={0.85}
          >
            <Text style={[styles.filterToggleText, bureauFilter === 'home' && styles.filterToggleTextActive]}>
              🏛️ {bureauName ? (bureauName.length > 14 ? bureauName.slice(0, 14) + '...' : bureauName) : 'My Bureau'} ({matches.filter((m) => m.is_home_bureau).length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Match List */}
      <FlatList
        data={matches.filter((m) => (bureauFilter === 'home' ? m.is_home_bureau : true))}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B1E3F']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No verified matches found in your community yet.</Text>
            <Text style={styles.emptySubtext}>Check back later as new members get approved.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <MatchCard
            item={item}
            onPress={() => handleCardPress(item.id)}
            calculateAge={calculateAge}
            formatSalary={formatSalary}
            isFavorite={favoritesList.includes(item.id)}
            onToggleFavorite={() => toggleFavorite(item.id)}
            onExpressInterest={() => handleExpressInterest(item.id)}
            onSendMessage={() => handleOpenChat(item.id)}
            interestStatus={interestsMap[item.id] || null}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE2',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B1E3F',
    letterSpacing: -0.5,
  },
  bureauBadge: {
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F8D7DA',
    maxWidth: 130,
  },
  bureauBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B1E3F',
  },
  signOutHeaderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5C6C6',
    backgroundColor: '#FFF5F5',
  },
  signOutHeaderText: {
    color: '#B23B3B',
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#8B1E3F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  cardImageContainer: {
    height: 220,
    position: 'relative',
    backgroundColor: '#EFEAE2',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3ECE0',
  },
  placeholderIcon: {
    fontSize: 48,
    color: '#D4C5B3',
  },
  communityTag: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(139, 30, 63, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 10,
  },
  communityTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verifiedBadgeOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 234, 226, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  verifiedBadgeText: {
    color: '#137333',
    fontSize: 11,
    fontWeight: '700',
  },
  cardDetails: {
    padding: 18,
  },
  cardName: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 21,
    fontWeight: '700',
    color: '#2C1B1F',
  },
  cardAge: {
    fontWeight: 'normal',
    color: '#706064',
  },
  partnerBadge: {
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F8D7DA',
  },
  partnerBadgeText: {
    color: '#8B1E3F',
    fontSize: 10,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#706064',
    marginTop: 4,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F5ECE2',
    paddingVertical: 10,
    marginBottom: 14,
    gap: 12,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    color: '#998E90',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metaValue: {
    fontSize: 13,
    color: '#2C1B1F',
    fontWeight: '600',
    marginTop: 2,
  },
  salaryContainer: {
    marginBottom: 14,
  },
  salaryLabel: {
    fontSize: 10,
    color: '#998E90',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  salaryValue: {
    fontSize: 14,
    color: '#2C1B1F',
    fontWeight: '700',
    marginTop: 2,
  },
  arrowOverlay: {
    position: 'absolute',
    top: '42%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 12,
  },
  leftArrow: {
    left: 12,
  },
  rightArrow: {
    right: 12,
  },
  arrowText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 26,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 12,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#8B1E3F',
    width: 16,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  heartButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  heartIconText: {
    fontSize: 18,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#706064',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#998E90',
    textAlign: 'center',
    marginTop: 8,
  },
  statusContentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  statusHeartBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8B1E3F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusHeartIcon: {
    fontSize: 32,
    color: '#F4E8D1',
  },
  bureauHeader: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 28,
    fontWeight: '700',
    color: '#2C1B1F',
    textAlign: 'center',
    marginBottom: 30,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    alignItems: 'center',
  },
  statusTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 20,
    fontWeight: '600',
    color: '#8B1E3F',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusDescription: {
    fontSize: 14,
    color: '#706064',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  statusAlert: {
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#EFE3D3',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  statusAlertText: {
    fontSize: 13,
    color: '#7C674F',
    lineHeight: 19,
    textAlign: 'center',
  },
  contactDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F5ECE2',
    width: '100%',
    paddingTop: 16,
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 12,
    color: '#998E90',
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B1E3F',
  },
  supportBtn: {
    marginTop: 14,
    backgroundColor: '#8B1E3F',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  supportBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  quickNavRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#EFEAE2',
  },
  quickNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAF7F2',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    shadowColor: '#8B1E3F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickNavIcon: {
    fontSize: 16,
  },
  quickNavText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C1B1F',
  },
  quickNavBadge: {
    backgroundColor: '#E11D48',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 2,
  },
  quickNavBadgeSecondary: {
    backgroundColor: '#64748B',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 2,
  },
  quickNavBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  filterToggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FAF7F2',
    borderBottomWidth: 1,
    borderColor: '#EFEAE2',
  },
  filterToggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterToggleBtnActive: {
    backgroundColor: '#8B1E3F',
    borderColor: '#8B1E3F',
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#706064',
  },
  filterToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#F5ECE2',
  },
  cardActionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  cardActionInterest: {
    backgroundColor: '#E11D48',
  },
  cardActionInterestText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  cardActionPending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  cardActionPendingText: {
    color: '#B45309',
    fontWeight: '800',
    fontSize: 13,
  },
  cardActionAccepted: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  cardActionAcceptedText: {
    color: '#047857',
    fontWeight: '800',
    fontSize: 13,
  },
  cardActionChat: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E11D48',
  },
  cardActionChatText: {
    color: '#E11D48',
    fontWeight: '800',
    fontSize: 13,
  },
  cardActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
