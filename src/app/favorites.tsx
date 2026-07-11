import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { MatchCard, MatchProfile } from './index';

interface FavoritesScreenProps {
  onViewProfile?: (profileId: string) => void;
}

export default function FavoritesScreen({ onViewProfile }: FavoritesScreenProps) {
  const { profile, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<MatchProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // 1. Call RPC helper function
      const { data, error } = await supabase
        .rpc('list_favorite_profiles');

      if (error) {
        console.error('Error fetching favorites:', error.message);
        return;
      }

      if (!data || data.length === 0) {
        setFavorites([]);
        return;
      }

      const rawProfiles = data as any[];

      // 2. Gather all paths to create signed URLs
      const allPaths: string[] = [];
      rawProfiles.forEach((p) => {
        if (p.image_paths && p.image_paths.length > 0) {
          allPaths.push(...p.image_paths);
        } else if (p.cover_image_path) {
          allPaths.push(p.cover_image_path);
        }
      });

      let urlMap = new Map<string, string>();
      if (allPaths.length > 0) {
        const { data: signedData } = await supabase
          .storage
          .from('profile-images')
          .createSignedUrls(allPaths, 3600);

        if (signedData) {
          signedData.forEach((item) => {
            if (item.signedUrl && item.path) {
              urlMap.set(item.path, item.signedUrl);
            }
          });
        }
      }

      // 3. Map everything to MatchProfile structure
      const formatted: MatchProfile[] = rawProfiles.map((p) => {
        const paths = p.image_paths || [];
        const urls = paths
          .map((path: string) => urlMap.get(path))
          .filter((url: any): url is string => !!url);

        if (urls.length === 0 && p.cover_image_path) {
          const coverUrl = urlMap.get(p.cover_image_path);
          if (coverUrl) urls.push(coverUrl);
        }

        return {
          id: p.id,
          full_name: p.full_name,
          dob: p.dob,
          gender: p.gender,
          occupation: p.occupation,
          current_place: p.current_place,
          native_place: p.native_place,
          community: p.community,
          salary: p.salary,
          salary_currency: p.salary_currency || 'INR',
          cover_image_path: p.cover_image_path,
          image_paths: paths,
          signed_images: urls,
          signed_cover_url: p.cover_image_path ? urlMap.get(p.cover_image_path) || null : null,
          bureau: {
            name: 'Partner Bureau',
          },
        };
      });

      setFavorites(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfavorite = async (profileId: string) => {
    if (!profile) return;
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', profile.user_id)
        .eq('profile_id', profileId);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setFavorites((prev) => prev.filter((item) => item.id !== profileId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchFavorites();
    }
  }, [profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFavorites();
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

  if (authLoading || (loading && favorites.length === 0)) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B1E3F" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logoText}>Favorites</Text>
        <Text style={styles.headerCount}>{favorites.length} bookmarked</Text>
      </View>

      {/* Favorites List */}
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B1E3F']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No favorites added yet.</Text>
            <Text style={styles.emptySubtext}>Tap the heart icon on matches to bookmark them.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <MatchCard
            item={item}
            onPress={() => onViewProfile && onViewProfile(item.id)}
            calculateAge={calculateAge}
            formatSalary={formatSalary}
            isFavorite={true}
            onToggleFavorite={() => handleUnfavorite(item.id)}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE2',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C1B1F',
  },
  headerCount: {
    fontSize: 12,
    color: '#8B1E3F',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
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
});
