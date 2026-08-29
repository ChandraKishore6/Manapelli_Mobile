import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

interface PublicProposal {
  id: string;
  full_name: string;
  age: number | null;
  gender: string;
  occupation: string | null;
  current_place: string | null;
  community: string | null;
  bureau_name: string;
  signed_cover_url: string | null;
}

export default function PublicProposalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProposal = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, full_name, dob, gender, community, occupation, current_place, native_place, cover_image_path, status, bureaus(name)')
          .eq('id', id)
          .maybeSingle();

        if (error || !profile || profile.status !== 'approved') {
          setProposal(null);
        } else {
          const age = profile.dob
            ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
            : null;

          let signedUrl: string | null = null;
          if (profile.cover_image_path) {
            const { data: signed } = await supabase.storage
              .from('profile-images')
              .createSignedUrl(profile.cover_image_path, 3600);
            signedUrl = signed?.signedUrl || null;
          }

          const bureauName = (profile.bureaus as any)?.name || 'ManaPelli Bureau';

          setProposal({
            id: profile.id,
            full_name: profile.full_name,
            age,
            gender: profile.gender,
            community: profile.community,
            occupation: profile.occupation,
            current_place: profile.current_place || profile.native_place,
            bureau_name: bureauName,
            signed_cover_url: signedUrl,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProposal();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B1E3F" />
      </View>
    );
  }

  if (!proposal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.notFoundTitle}>Proposal Not Found</Text>
          <Text style={styles.notFoundSub}>This matrimonial proposal link may have expired or is no longer active.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/')}>
            <Text style={styles.primaryBtnText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Matrimonial Proposal</Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.loginText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Photo & Watermark */}
          <View style={styles.photoContainer}>
            {proposal.signed_cover_url ? (
              <Image source={{ uri: proposal.signed_cover_url }} style={styles.photo} contentFit="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={{ fontSize: 36, color: '#8B1E3F' }}>💍</Text>
              </View>
            )}

            {/* Protective Watermark Badge */}
            <View style={styles.watermarkBadge}>
              <Text style={styles.watermarkText}>ManaPelli ❤️ Official</Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.detailsBody}>
            <Text style={styles.bureauTag}>🏛️ {proposal.bureau_name}</Text>
            <Text style={styles.candidateName}>
              {proposal.full_name}{proposal.age ? `, ${proposal.age} Yrs` : ''}
            </Text>

            <View style={styles.infoGrid}>
              {proposal.occupation && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Profession</Text>
                  <Text style={styles.infoValue}>{proposal.occupation}</Text>
                </View>
              )}
              {proposal.community && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Community</Text>
                  <Text style={styles.infoValue}>{proposal.community}</Text>
                </View>
              )}
              {proposal.current_place && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>{proposal.current_place}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.viewFullBtn} onPress={() => router.push(`/profile/${proposal.id}`)}>
              <Text style={styles.viewFullBtnText}>View Full Profile & Photos →</Text>
            </TouchableOpacity>
          </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backText: {
    color: '#8B1E3F',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C1B1F',
  },
  loginText: {
    color: '#8B1E3F',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  photoContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#FAF5EE',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermarkBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  watermarkText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailsBody: {
    padding: 20,
  },
  bureauTag: {
    fontSize: 12,
    color: '#8B1E3F',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  candidateName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2C1B1F',
    marginBottom: 16,
  },
  infoGrid: {
    backgroundColor: '#FAF5EE',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 12,
    color: '#706064',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#2C1B1F',
    fontWeight: '700',
  },
  viewFullBtn: {
    backgroundColor: '#8B1E3F',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewFullBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C1B1F',
    marginBottom: 8,
  },
  notFoundSub: {
    fontSize: 14,
    color: '#706064',
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: '#8B1E3F',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
