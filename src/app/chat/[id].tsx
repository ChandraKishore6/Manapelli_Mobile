import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { getCachedSignedUrl } from '../../lib/photoCache';
import { BlockReportModal } from '../../components/BlockReportModal';

interface Message {
  id: string;
  sender_user_id: string;
  receiver_user_id: string;
  sender_profile_id: string;
  receiver_profile_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  isMine: boolean;
}

interface PeerProfile {
  id: string;
  user_id: string;
  full_name: string;
  gender: string;
  occupation: string | null;
  cover_image_path: string | null;
  bureau_name?: string | null;
}

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const peerProfileId = params.id as string;
  const { profile, user } = useAuth();

  const flatListRef = useRef<FlatList>(null);
  const [peerProfile, setPeerProfile] = useState<PeerProfile | null>(null);
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [interestStatus, setInterestStatus] = useState<'pending' | 'accepted' | 'declined' | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlocker, setIsBlocker] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch conversation data
  const loadConversationData = async () => {
    if (!profile?.id || !user?.id || !peerProfileId) return;

    try {
      // 1. Fetch Peer Profile info
      const { data: peerData, error: peerError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, gender, occupation, cover_image_path, bureaus(name)')
        .eq('id', peerProfileId)
        .single();

      if (peerError) {
        console.error('Error fetching peer profile:', peerError.message);
      } else if (peerData) {
        const p: PeerProfile = {
          id: peerData.id,
          user_id: peerData.user_id,
          full_name: peerData.full_name || 'Candidate',
          gender: peerData.gender || 'female',
          occupation: peerData.occupation,
          cover_image_path: peerData.cover_image_path,
          bureau_name: (peerData as any).bureaus?.name,
        };
        setPeerProfile(p);

        // Fetch 24h cached photo
        if (p.cover_image_path) {
          const url = await getCachedSignedUrl(p.cover_image_path);
          setSignedPhotoUrl(url);
        }
      }

      // 2. Fetch interest status
      const { data: intData } = await supabase
        .from('interests')
        .select('id, status, sender_profile_id')
        .or(
          `and(sender_profile_id.eq.${profile.id},receiver_profile_id.eq.${peerProfileId}),and(sender_profile_id.eq.${peerProfileId},receiver_profile_id.eq.${profile.id})`
        )
        .maybeSingle();

      setInterestStatus(intData?.status || null);

      // 3. Fetch block status
      const { data: blockRow } = await supabase
        .from('user_blocks')
        .select('blocker_profile_id')
        .or(
          `and(blocker_profile_id.eq.${profile.id},blocked_profile_id.eq.${peerProfileId}),and(blocker_profile_id.eq.${peerProfileId},blocked_profile_id.eq.${profile.id})`
        )
        .maybeSingle();

      setIsBlocked(!!blockRow);
      setIsBlocker(blockRow?.blocker_profile_id === profile.id);

      // 4. Fetch messages
      const { data: msgsData, error: msgsError } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_profile_id.eq.${profile.id},receiver_profile_id.eq.${peerProfileId}),and(sender_profile_id.eq.${peerProfileId},receiver_profile_id.eq.${profile.id})`
        )
        .order('created_at', { ascending: true });

      if (msgsError) {
        console.error('Error fetching messages:', msgsError.message);
      } else if (msgsData) {
        const formatted: Message[] = msgsData.map((m: any) => ({
          ...m,
          isMine: m.sender_profile_id === profile.id || m.sender_user_id === user.id,
        }));
        setMessages(formatted);

        // Mark unread messages from this peer as read
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('sender_profile_id', peerProfileId)
          .eq('receiver_user_id', user.id)
          .eq('is_read', false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversationData();
  }, [profile?.id, user?.id, peerProfileId]);

  // Realtime Supabase WebSocket Listener (Critical Rule 1)
  useEffect(() => {
    if (!profile?.id || !peerProfileId) return;

    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // Instantly refresh messages stream when postgres changes occur
          loadConversationData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, peerProfileId]);

  // Send message
  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || !profile?.id || !user?.id || !peerProfile || sending) return;

    setSending(true);
    try {
      // Check block status
      if (isBlocked) {
        Alert.alert('Blocked', 'You cannot send messages as this conversation is blocked.');
        return;
      }

      // Check message counts
      const mySentCount = messages.filter((m) => m.isMine).length;
      const peerSentCount = messages.filter((m) => !m.isMine).length;
      const isAccepted = interestStatus === 'accepted' || peerSentCount > 0;

      // Enforce 1 initial message rule
      if (!isAccepted && mySentCount >= 1) {
        Alert.alert(
          'Message Locked',
          'You have sent an initial message. Please wait for the recipient to reply or accept the conversation.'
        );
        return;
      }

      const targetUserId = peerProfile.user_id || peerProfileId;

      // 1. Insert message
      const { data: inserted, error: insertError } = await supabase
        .from('messages')
        .insert({
          sender_user_id: user.id,
          receiver_user_id: targetUserId,
          sender_profile_id: profile.id,
          receiver_profile_id: peerProfileId,
          message: text,
          is_read: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setInputText('');

      // If replying to peer's initial message, auto-accept interest to permanently unlock chat
      if (peerSentCount > 0 && interestStatus !== 'accepted') {
        const { data: existingInt } = await supabase
          .from('interests')
          .select('id')
          .or(
            `and(sender_profile_id.eq.${profile.id},receiver_profile_id.eq.${peerProfileId}),and(sender_profile_id.eq.${peerProfileId},receiver_profile_id.eq.${profile.id})`
          )
          .maybeSingle();

        if (existingInt) {
          await supabase
            .from('interests')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', existingInt.id);
        } else {
          await supabase.from('interests').insert({
            sender_profile_id: peerProfileId,
            receiver_profile_id: profile.id,
            status: 'accepted',
          });
        }
        setInterestStatus('accepted');
      }

      loadConversationData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  // Accept Conversation action
  const handleAcceptConversation = async () => {
    if (!profile?.id || !peerProfileId) return;
    try {
      const { data: existingInt } = await supabase
        .from('interests')
        .select('id')
        .or(
          `and(sender_profile_id.eq.${profile.id},receiver_profile_id.eq.${peerProfileId}),and(sender_profile_id.eq.${peerProfileId},receiver_profile_id.eq.${profile.id})`
        )
        .maybeSingle();

      if (existingInt) {
        await supabase
          .from('interests')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', existingInt.id);
      } else {
        await supabase.from('interests').insert({
          sender_profile_id: peerProfileId,
          receiver_profile_id: profile.id,
          status: 'accepted',
        });
      }

      setInterestStatus('accepted');
      Alert.alert('Success 🎉', 'Conversation accepted! Unlimited chat is now unlocked.');
      loadConversationData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to accept conversation.');
    }
  };

  // Compute Chat Input Lock (Critical Rule 3)
  const mySentCount = messages.filter((m) => m.isMine).length;
  const peerSentCount = messages.filter((m) => !m.isMine).length;
  const isAccepted = interestStatus === 'accepted' || peerSentCount > 0;

  // Rule 3: sentByMe == 1 and sentByPeer == 0 and status != 'accepted'
  const isInputLocked = !isBlocked && !isAccepted && peerSentCount === 0 && mySentCount >= 1;
  const canSendMessage = !isBlocked && !isInputLocked;
  const isIncomingPending = !isBlocked && !isAccepted && peerSentCount > 0 && mySentCount === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerProfileRow}
          onPress={() => router.push(`/profile/${peerProfileId}` as any)}
          activeOpacity={0.8}
        >
          {signedPhotoUrl ? (
            <Image source={{ uri: signedPhotoUrl }} style={styles.headerAvatar} contentFit="cover" />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={styles.headerAvatarFallbackText}>
                {peerProfile?.gender === 'female' ? '👩' : '👨'}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {peerProfile?.full_name || 'Candidate'}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {peerProfile?.bureau_name ? `🏛️ ${peerProfile.bureau_name}` : 'Verified Candidate'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.menuBtnText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Banners */}
      {isBlocked ? (
        <View style={styles.blockedBanner}>
          <Text style={styles.blockedBannerText}>
            🛡️ {isBlocker ? 'You have blocked this candidate.' : 'This conversation is unavailable.'}
          </Text>
        </View>
      ) : isIncomingPending ? (
        <View style={styles.incomingBanner}>
          <Text style={styles.incomingBannerText}>
            📩 {peerProfile?.full_name} sent you a message. Reply or Accept to unlock unlimited chat!
          </Text>
          <TouchableOpacity style={styles.acceptBannerBtn} onPress={handleAcceptConversation}>
            <Text style={styles.acceptBannerBtnText}>✓ Accept</Text>
          </TouchableOpacity>
        </View>
      ) : isInputLocked ? (
        <View style={styles.lockedBanner}>
          <Text style={styles.lockedBannerText}>
            ⏳ Initial message sent. Input locked until {peerProfile?.full_name || 'candidate'} replies or accepts.
          </Text>
        </View>
      ) : null}

      {/* Message List */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#e11d48" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💌</Text>
                <Text style={styles.emptyTitle}>Start the Conversation</Text>
                <Text style={styles.emptySubtitle}>
                  Send 1 initial message to {peerProfile?.full_name || 'this candidate'}.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.msgBubbleWrapper,
                  item.isMine ? styles.msgMineWrapper : styles.msgPeerWrapper,
                ]}
              >
                <View style={[styles.msgBubble, item.isMine ? styles.msgMine : styles.msgPeer]}>
                  <Text style={[styles.msgText, item.isMine ? styles.msgMineText : styles.msgPeerText]}>
                    {item.message}
                  </Text>
                </View>
                <Text style={styles.msgTime}>
                  {new Date(item.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}
          />
        )}

        {/* Input Bar (Locked per Rule 3) */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.textInput, !canSendMessage && styles.textInputDisabled]}
            value={inputText}
            onChangeText={setInputText}
            editable={canSendMessage}
            placeholder={
              isBlocked
                ? 'Conversation blocked'
                : isInputLocked
                ? `Waiting for ${peerProfile?.full_name || 'candidate'} to reply…`
                : `Write a message to ${peerProfile?.full_name || 'candidate'}…`
            }
            placeholderTextColor="#94a3b8"
            multiline
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!canSendMessage || !inputText.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!canSendMessage || !inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.sendBtnIcon}>➔</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Block / Report Modal */}
      <BlockReportModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        myProfileId={profile?.id || null}
        targetProfileId={peerProfileId}
        targetName={peerProfile?.full_name}
        onSuccessBlockOrReport={() => {
          loadConversationData();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  backBtn: {
    paddingVertical: 8,
    paddingRight: 10,
  },
  backBtnText: {
    fontSize: 16,
    color: '#e11d48',
    fontWeight: '600',
  },
  headerProfileRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#cbd5e1',
  },
  headerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarFallbackText: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  menuBtn: {
    padding: 8,
  },
  menuBtnText: {
    fontSize: 20,
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
  blockedBanner: {
    backgroundColor: '#f1f5f9',
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#cbd5e1',
  },
  blockedBannerText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  incomingBanner: {
    backgroundColor: '#fff1f2',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderBottomWidth: 1,
    borderColor: '#f43f5e',
  },
  incomingBannerText: {
    fontSize: 12,
    color: '#9f1239',
    fontWeight: '600',
    flex: 1,
  },
  acceptBannerBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  acceptBannerBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  lockedBanner: {
    backgroundColor: '#fef3c7',
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#f59e0b',
  },
  lockedBannerText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
    textAlign: 'center',
  },
  messagesList: {
    padding: 16,
    gap: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  msgBubbleWrapper: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  msgMineWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  msgPeerWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  msgBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  msgMine: {
    backgroundColor: '#e11d48',
    borderBottomRightRadius: 2,
  },
  msgPeer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 2,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 20,
  },
  msgMineText: {
    color: '#ffffff',
  },
  msgPeerText: {
    color: '#0f172a',
  },
  msgTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    marginHorizontal: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
    maxHeight: 100,
  },
  textInputDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    color: '#94a3b8',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  sendBtnIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
