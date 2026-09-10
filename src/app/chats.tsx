import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

interface ConversationPeer {
  id: string;
  full_name: string;
  gender: string;
  occupation: string | null;
  cover_image_path: string | null;
  bureau_name?: string | null;
}

interface ConversationItem {
  peerProfile: ConversationPeer;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
}

function timeAgo(dateString: string | null): string {
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

export default function ChatsListScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [photosMap, setPhotosMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async () => {
    if (!profile?.id || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch all accepted interests involving me
      const { data: acceptedInterests } = await supabase
        .from('interests')
        .select('sender_profile_id, receiver_profile_id')
        .or(`sender_profile_id.eq.${profile.id},receiver_profile_id.eq.${profile.id}`)
        .eq('status', 'accepted');

      const peerIds = new Set<string>();
      (acceptedInterests || []).forEach((row: any) => {
        if (row.sender_profile_id !== profile.id) peerIds.add(row.sender_profile_id);
        if (row.receiver_profile_id !== profile.id) peerIds.add(row.receiver_profile_id);
      });

      // 2. Also include profiles where messages exist
      const { data: pastMsgs } = await supabase
        .from('messages')
        .select('sender_profile_id, receiver_profile_id')
        .or(`sender_profile_id.eq.${profile.id},receiver_profile_id.eq.${profile.id}`);

      (pastMsgs || []).forEach((m: any) => {
        if (m.sender_profile_id && m.sender_profile_id !== profile.id) peerIds.add(m.sender_profile_id);
        if (m.receiver_profile_id && m.receiver_profile_id !== profile.id) peerIds.add(m.receiver_profile_id);
      });

      if (peerIds.size === 0) {
        setConversations([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const peerArray = Array.from(peerIds);

      // 3. Fetch peer profile details via RPC function
      const peersData = (
        await Promise.all(
          peerArray.map(async (pId) => {
            const { data } = await supabase.rpc('get_peer_profile', { _id: pId }).maybeSingle();
            return data;
          })
        )
      ).filter(Boolean);

      // 4. Fetch last message and unread count for each peer
      const convList: ConversationItem[] = await Promise.all(
        (peersData || []).map(async (peerRow: any) => {
          const peer: ConversationPeer = {
            id: peerRow.id,
            full_name: peerRow.full_name || 'Candidate',
            gender: peerRow.gender || 'female',
            occupation: peerRow.occupation,
            cover_image_path: peerRow.cover_image_path,
            bureau_name: peerRow.bureau_name,
          };

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('message, created_at')
            .or(
              `and(sender_profile_id.eq.${profile.id},receiver_profile_id.eq.${peer.id}),and(sender_profile_id.eq.${peer.id},receiver_profile_id.eq.${profile.id})`
            )
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('sender_profile_id', peer.id)
            .eq('receiver_user_id', user.id)
            .eq('is_read', false);

          return {
            peerProfile: peer,
            lastMessage: lastMsg?.message || 'Interest Accepted — start chatting!',
            lastMessageAt: lastMsg?.created_at || null,
            unreadCount: unreadCount || 0,
          };
        })
      );

      // Sort by last message timestamp descending
      convList.sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
      });

      setConversations(convList);

      // Pre-cache 24h photo URLs
      const paths = convList.map((item) => item.peerProfile.cover_image_path);
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
    fetchConversations();
  }, [profile?.id, user?.id]);

  // Realtime Supabase WebSocket Listener for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages & Chats</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#e11d48" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.peerProfile.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchConversations();
              }}
              tintColor="#e11d48"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No Active Chats</Text>
              <Text style={styles.emptySubtitle}>
                Browse candidate profiles or express interest to start a conversation! Anyone can send 1 initial message.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const peer = item.peerProfile;
            const photoUrl = peer.cover_image_path ? photosMap[peer.cover_image_path] : null;

            return (
              <TouchableOpacity
                style={styles.chatCard}
                onPress={() => router.push(`/chat/${peer.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarWrapper}>
                  {photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>
                        {peer.gender === 'female' ? '👩' : '👨'}
                      </Text>
                    </View>
                  )}
                  {item.unreadCount > 0 ? <View style={styles.unreadDot} /> : null}
                </View>

                <View style={styles.chatInfo}>
                  <View style={styles.chatTitleRow}>
                    <Text style={styles.peerName} numberOfLines={1}>
                      {peer.full_name}
                    </Text>
                    <Text style={styles.timeText}>{timeAgo(item.lastMessageAt)}</Text>
                  </View>

                  <View style={styles.chatSnippetRow}>
                    <Text
                      style={[styles.lastMsgText, item.unreadCount > 0 && styles.lastMsgUnread]}
                      numberOfLines={1}
                    >
                      {item.lastMessage}
                    </Text>

                    {item.unreadCount > 0 ? (
                      <View style={styles.badgeUnread}>
                        <Text style={styles.badgeUnreadText}>{item.unreadCount}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
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
    backgroundColor: '#ffffff',
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
    paddingVertical: 8,
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
  chatCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#cbd5e1',
  },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 26,
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e11d48',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  peerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 8,
  },
  chatSnippetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMsgText: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  lastMsgUnread: {
    color: '#0f172a',
    fontWeight: '700',
  },
  badgeUnread: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  badgeUnreadText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
