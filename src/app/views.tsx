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

interface ViewerProfile {
  id: string;
  full_name: string;
  dob: string | null;
  gender: string;
  occupation: string | null;
  current_place: string | null;
  cover_image_path: string | null;
  bureau_name?: string | null;
}

interface ViewItem {
  profile: ViewerProfile;
  latestViewedAt: string;
  viewCount: number;
}

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function timeAgo(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  let interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval}d ago`;

  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval}h ago`;

  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval}m ago`;

  return 'Just now';
}

export default function ProfileViewsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [viewsList, setViewsList] = useState<ViewItem[]>([]);
  const [photosMap, setPhotosMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingInterestId, setSendingInterestId] = useState<string | null>(null);

  const fetchProfileViews = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      // 1. Query profile_views joined with viewer profile & bureau
      const { data: rows, error } = await supabase
        .from('profile_views')
        .select(`
          id, viewed_at,
          viewer:profiles!profile_views_viewer_profile_id_fkey(
            id, full_name, dob, gender, occupation, current_place, cover_image_path,
            bureaus(name)
          )
        `)
        .eq('viewed_profile_id', profile.id)
        .order('viewed_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Deduplicate views by viewer profile ID
      const map = new Map<string, ViewItem>();
      (rows || []).forEach((row: any) => {
        if (!row.viewer) return;
        const vid = row.viewer.id;
        if (!map.has(vid)) {
          map.set(vid, {
            profile: {
              id: row.viewer.id,
              full_name: row.viewer.full_name || 'Candidate',
              dob: row.viewer.dob,
              gender: row.viewer.gender || 'male',
              occupation: row.viewer.occupation,
              current_place: row.viewer.current_place,
              cover_image_path: row.viewer.cover_image_path,
              bureau_name: row.viewer.bureaus?.name,
            },
            latestViewedAt: row.viewed_at,
            viewCount: 1,
          });
        } else {
          const item = map.get(vid)!;
          item.viewCount += 1;
        }
      });

      const uniqueViews = Array.from(map.values());
      setViewsList(uniqueViews);

      // Pre-cache 24h photo URLs
      const paths = uniqueViews.map((v) => v.profile.cover_image_path);
      const cached = await getCachedSignedUrls(paths);
      setPhotosMap(cached);
    } catch (err) {
      console.error('Error fetching profile views:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfileViews();
  }, [profile?.id]);

  const handleExpressInterest = async (targetProfileId: string) => {
    if (!profile?.id) return;
    setSendingInterestId(targetProfileId);
    try {
      const { data: existing } = await supabase
        .from('interests')
        .select('id, status')
        .eq('sender_profile_id', profile.id)
        .eq('receiver_profile_id', targetProfileId)
        .maybeSingle();

      if (existing) {
        Alert.alert('Info', 'You have already expressed interest in this candidate.');
        return;
      }

      const { error } = await supabase.from('interests').insert({
        sender_profile_id: profile.id,
        receiver_profile_id: targetProfileId,
        status: 'pending',
      });

      if (error) throw error;
      Alert.alert('Success 🎉', 'Interest expressed successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not express interest.');
    } finally {
      setSendingInterestId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Who Viewed My Profile</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#e11d48" />
          <Text style={styles.loadingText}>Loading profile views...</Text>
        </View>
      ) : (
        <FlatList
          data={viewsList}
          keyExtractor={(item) => item.profile.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchProfileViews();
              }}
              tintColor="#e11d48"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👁️</Text>
              <Text style={styles.emptyTitle}>No Profile Views Yet</Text>
              <Text style={styles.emptySubtitle}>
                When candidates view your profile while browsing matches, they will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const p = item.profile;
            const photoUrl = p.cover_image_path ? photosMap[p.cover_image_path] : null;
            const ageVal = calculateAge(p.dob);
            const isSending = sendingInterestId === p.id;

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

                      <View style={styles.viewBadge}>
                        <Text style={styles.viewBadgeText}>
                          {timeAgo(item.latestViewedAt)}
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
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnInterest]}
                    onPress={() => handleExpressInterest(p.id)}
                    disabled={isSending}
                  >
                    {isSending ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.btnInterestText}>💖 Express Interest</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.btnView]}
                    onPress={() => router.push(`/profile/${p.id}` as any)}
                  >
                    <Text style={styles.btnViewText}>View Profile</Text>
                  </TouchableOpacity>
                </View>
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
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 52,
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
  viewBadge: {
    backgroundColor: '#fff1f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  viewBadgeText: {
    color: '#be123c',
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
  btnInterest: {
    backgroundColor: '#e11d48',
  },
  btnInterestText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  btnView: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  btnViewText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
});
