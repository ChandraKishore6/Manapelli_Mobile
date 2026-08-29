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

interface PublicBureau {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  about_us: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  profile_count?: number;
  communities?: string[];
}

export default function PublicBureauScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [bureau, setBureau] = useState<PublicBureau | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBureau = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_public_bureau_by_slug', { _slug: slug });
        if (error) {
          console.error('Error fetching bureau:', error.message);
        } else if (data) {
          const row = Array.isArray(data) ? data[0] : data;
          setBureau(row as PublicBureau);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBureau();
  }, [slug]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B1E3F" />
      </View>
    );
  }

  if (!bureau) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.notFoundTitle}>Bureau Not Found</Text>
          <Text style={styles.notFoundSub}>The requested bureau page does not exist.</Text>
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
        {/* Header Bar */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          {bureau.logo_url ? (
            <Image source={{ uri: bureau.logo_url }} style={styles.logo} contentFit="cover" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>{bureau.name?.[0] || 'B'}</Text>
            </View>
          )}

          <Text style={styles.bureauName}>{bureau.name}</Text>
          {bureau.location && <Text style={styles.location}>📍 {bureau.location}</Text>}

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                👥 {bureau.profile_count ?? 0} Approved Member{(bureau.profile_count ?? 0) === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {bureau.communities && bureau.communities.length > 0 && (
            <View style={styles.commChipRow}>
              {bureau.communities.map((comm, idx) => (
                <View key={idx} style={styles.commChip}>
                  <Text style={styles.commChipText}>{comm}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push({ pathname: '/register-profile', params: { bureau: bureau.slug } })}
          >
            <Text style={styles.registerBtnText}>Join & Submit Profile to {bureau.name}</Text>
          </TouchableOpacity>
        </View>

        {/* Story Section */}
        {bureau.about_us && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>About Us & Our Story</Text>
            <Text style={styles.aboutText}>{bureau.about_us}</Text>
          </View>
        )}

        {/* Contact Info Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          {bureau.contact_phone && (
            <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`tel:${bureau.contact_phone}`)}>
              <Text style={styles.contactIcon}>📞</Text>
              <Text style={styles.contactValue}>{bureau.contact_phone}</Text>
            </TouchableOpacity>
          )}
          {bureau.contact_email && (
            <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${bureau.contact_email}`)}>
              <Text style={styles.contactIcon}>✉️</Text>
              <Text style={styles.contactValue}>{bureau.contact_email}</Text>
            </TouchableOpacity>
          )}
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
  backBtn: {
    marginBottom: 16,
  },
  backBtnText: {
    fontSize: 16,
    color: '#8B1E3F',
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginBottom: 16,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: 12,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#8B1E3F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  bureauName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C1B1F',
    textAlign: 'center',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#706064',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#FDF2F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#8B1E3F',
    fontSize: 13,
    fontWeight: '600',
  },
  commChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 16,
  },
  commChip: {
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#EFE3D3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  commChipText: {
    fontSize: 12,
    color: '#7C674F',
  },
  registerBtn: {
    backgroundColor: '#8B1E3F',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  registerBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C1B1F',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    color: '#706064',
    lineHeight: 22,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  contactIcon: {
    fontSize: 18,
  },
  contactValue: {
    fontSize: 14,
    color: '#8B1E3F',
    fontWeight: '600',
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
