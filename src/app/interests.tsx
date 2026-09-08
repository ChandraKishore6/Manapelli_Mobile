import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
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

interface ProfileInfo {
  id: string;
  full_name: string;
  dob: string | null;
  gender: string;
  occupation: string | null;
  current_place: string | null;
  cover_image_path: string | null;
  bureau_name?: string | null;
}

interface InterestItem {
  id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  profile: ProfileInfo;
}

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export default function InterestsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [receivedList, setReceivedList] = useState<InterestItem[]>([]);
  const [sentList, setSentList] = useState<InterestItem[]>([]);
  const [photosMap, setPhotosMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchInterests = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch Received Interests
      const { data: recData, error: recError } = await supabase
        .from('interests')
        .select(`
          id, status, created_at, updated_at,
          sender:profiles!interests_sender_profile_id_fkey(
            id, full_name, dob, gender, occupation, current_place, cover_image_path,
            bureaus(name)
          )
        `)
        .eq('receiver_profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (recError) console.error('Error fetching received interests:', recError.message);

      const parsedReceived: InterestItem[] = (recData || []).map((row: any) => ({
        id: row.id,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        profile: {
          id: row.sender?.id,
          full_name: row.sender?.full_name || 'Candidate',
          dob: row.sender?.dob,
          gender: row.sender?.gender || 'male',
          occupation: row.sender?.occupation,
          current_place: row.sender?.current_place,
          cover_image_path: row.sender?.cover_image_path,
          bureau_name: row.sender?.bureaus?.name,
        },
      }));

      // 2. Fetch Sent Interests
      const { data: sentData, error: sentError } = await supabase
        .from('interests')
        .select(`
          id, status, created_at, updated_at,
          receiver:profiles!interests_receiver_profile_id_fkey(
            id, full_name, dob, gender, occupation, current_place, cover_image_path,
            bureaus(name)
          )
        `)
        .eq('sender_profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (sentError) console.error('Error fetching sent interests:', sentError.message);

      const parsedSent: InterestItem[] = (sentData || []).map((row: any) => ({
        id: row.id,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        profile: {
          id: row.receiver?.id,
          full_name: row.receiver?.full_name || 'Candidate',
          dob: row.receiver?.dob,
          gender: row.receiver?.gender || 'female',
          occupation: row.receiver?.occupation,
          current_place: row.receiver?.current_place,
          cover_image_path: row.receiver?.cover_image_path,
          bureau_name: row.receiver?.bureaus?.name,
        },
      }));

      setReceivedList(parsedReceived);
      setSentList(parsedSent);

      // Pre-cache 24h photo URLs
      const paths = [
        ...parsedReceived.map((item) => item.profile.cover_image_path),
        ...parsedSent.map((item) => item.profile.cover_image_path),
      ];
      const cached = await getCachedSignedUrls(paths);
      setPhotosMap(cached);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInterests();
  }, [profile?.id]);

  const handleRespond = async (interestId: string, action: 'accepted' | 'declined') => {
    setActionLoadingId(interestId);
    try {
      const { error } = await supabase
        .from('interests')
        .update({ status: action, updated_at: new Date().toISOString() })
        .eq('id', interestId);

      if (error) throw error;

      Alert.alert(
        action === 'accepted' ? 'Interest Accepted 🎉' : 'Interest Declined',
        action === 'accepted' ? 'You can now start chatting with this candidate!' : 'Request has been declined.'
      );
      fetchInterests();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update interest request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const currentList = activeTab === 'received' ? receivedList : sentList;
  const pendingReceivedCount = receivedList.filter((i) => i.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Express Interests</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.tabActive]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
            📩 Received ({pendingReceivedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.tabActive]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>
            📤 Sent ({sentList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#e11d48" />
          <Text style={styles.loadingText}>Loading interests...</Text>
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchInterests();
              }}
              tintColor="#e11d48"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{activeTab === 'received' ? '📩' : '📤'}</Text>
              <Text style={styles.emptyTitle}>
                {activeTab === 'received' ? 'No Received Interests' : 'No Sent Interests'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'received'
                  ? 'When candidates express interest in your profile, they will appear here.'
                  : 'Browse candidate profiles and tap "Express Interest" to send a request.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const p = item.profile;
            const photoUrl = p.cover_image_path ? photosMap[p.cover_image_path] : null;
            const ageVal = calculateAge(p.dob);
            const isPending = item.status === 'pending';
            const isAccepted = item.status === 'accepted';
            const isDeclined = item.status === 'declined';
            const isActioning = actionLoadingId === item.id;

            return (
              <View style={styles.card}>
                <View style={styles.cardMain}>
                  <TouchableOpacity
                    onPress={() => router.push(`/profile/${p.id}` as any)}
                    activeOpacity={0.8}
                  >
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={styles.avatar} contentFit="cover" />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarFallbackText}>
                          {p.gender === 'female' ? '👩' : '👨'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.infoWrapper}>
                    <View style={styles.nameRow}>
                      <TouchableOpacity
                        onPress={() => router.push(`/profile/${p.id}` as any)}
                        style={{ flex: 1 }}
                      >
                        <Text style={styles.nameText} numberOfLines={1}>
                          {p.full_name}
                          {ageVal ? <Text style={styles.ageText}>, {ageVal} yrs</Text> : null}
                        </Text>
                      </TouchableOpacity>

                      <View
                        style={[
                          styles.badge,
                          isAccepted
                            ? styles.badgeAccepted
                            : isDeclined
                            ? styles.badgeDeclined
                            : styles.badgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            isAccepted
                              ? styles.badgeTextAccepted
                              : isDeclined
                              ? styles.badgeTextDeclined
                              : styles.badgeTextPending,
                          ]}
                        >
                          {isAccepted ? 'Accepted 🎉' : isDeclined ? 'Declined' : 'Pending ⏳'}
                        </Text>
                      </View>
                    </View>

                    {p.occupation ? (
                      <Text style={styles.metaText} numberOfLines={1}>
                        💼 {p.occupation}
                      </Text>
                    ) : null}

                    {p.current_place ? (
                      <Text style={styles.metaText} numberOfLines={1}>
                        📍 {p.current_place}
                      </Text>
                    ) : null}

                    {p.bureau_name ? (
                      <Text style={styles.bureauTag} numberOfLines={1}>
                        🏛️ {p.bureau_name}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Actions */}
                {activeTab === 'received' && isPending ? (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnAccept]}
                      onPress={() => handleRespond(item.id, 'accepted')}
                      disabled={isActioning}
                    >
                      {isActioning ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.btnAcceptText}>✓ Accept Interest</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btn, styles.btnDecline]}
                      onPress={() => handleRespond(item.id, 'declined')}
                      disabled={isActioning}
                    >
                      <Text style={styles.btnDeclineText}>✕ Decline</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {isAccepted ? (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnChat]}
                      onPress={() => router.push(`/chat/${p.id}` as any)}
                    >
                      <Text style={styles.btnChatText}>💬 Start Chat</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  backBtnText: {
    fontSize: 16,
    color: '#e11d48',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#be123c',
    fontWeight: '700',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748b',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardMain: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#cbd5e1',
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 32,
  },
  infoWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  ageText: {
    fontWeight: '400',
    color: '#64748b',
    fontSize: 14,
  },
  metaText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 1,
  },
  bureauTag: {
    fontSize: 11,
    color: '#be123c',
    backgroundColor: '#fff1f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  badgeTextPending: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeAccepted: {
    backgroundColor: '#d1fae5',
  },
  badgeTextAccepted: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeDeclined: {
    backgroundColor: '#f1f5f9',
  },
  badgeTextDeclined: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAccept: {
    backgroundColor: '#10b981',
  },
  btnAcceptText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  btnDecline: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  btnDeclineText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  btnChat: {
    backgroundColor: '#e11d48',
  },
  btnChatText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
