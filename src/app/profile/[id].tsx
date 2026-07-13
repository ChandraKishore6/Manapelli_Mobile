import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
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

interface ProfileDetail {
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
  partner_preferences: string | null;
  email: string | null;
  phone: string | null;
  cover_image_path: string | null;
}

interface ProfileImage {
  id: string;
  storage_path: string;
  is_cover: boolean;
  sort_order: number;
  signed_url?: string | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORAGE_URL = 'https://npvmvqminzgbuxibonta.supabase.co/storage/v1/object/public/profile-images/';

interface ProfileDetailScreenProps {
  id?: string;
  onBack?: () => void;
}

export default function ProfileDetailScreen({ id: propId, onBack: propOnBack }: ProfileDetailScreenProps) {
  const params = useLocalSearchParams();
  const id = propId || (params.id as string);
  const router = useRouter();
  const handleBack = propOnBack || (() => router.back());
  
  const scrollViewRef = useRef<ScrollView>(null);
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [images, setImages] = useState<ProfileImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [signedCoverUrl, setSignedCoverUrl] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const fetchProfileDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Fetch profile details via RPC function to comply with RLS policy
      const { data: profileData, error: profileError } = await supabase
        .rpc('get_peer_profile', { _id: id })
        .single();

      if (profileError) {
        console.error('Error fetching profile detail:', profileError.message);
      } else {
        const pData = profileData as ProfileDetail;
        setProfile(pData);
        
        // Fetch signed URL for cover image
        if (pData.cover_image_path) {
          const { data: signedCover } = await supabase
            .storage
            .from('profile-images')
            .createSignedUrl(pData.cover_image_path, 3600);
          if (signedCover) {
            setSignedCoverUrl(signedCover.signedUrl);
          }
        }
      }

      // 2. Fetch all profile images
      const { data: imagesData, error: imagesError } = await supabase
        .from('profile_images')
        .select('*')
        .eq('profile_id', id)
        .order('sort_order', { ascending: true });

      if (imagesError) {
        console.error('Error fetching profile images:', imagesError.message);
      } else if (imagesData) {
        const paths = (imagesData as ProfileImage[]).map((img) => img.storage_path);
        if (paths.length > 0) {
          const { data: signedUrls } = await supabase
            .storage
            .from('profile-images')
            .createSignedUrls(paths, 3600);

          if (signedUrls) {
            const urlMap = new Map<string, string>();
            signedUrls.forEach((item) => {
                if (item.signedUrl && item.path) {
                  urlMap.set(item.path as string, item.signedUrl);
                }
            });

            const imagesWithUrls = (imagesData as ProfileImage[]).map((img) => ({
              ...img,
              signed_url: urlMap.get(img.storage_path) || null,
            }));
            setImages(imagesWithUrls);
          } else {
            setImages(imagesData as ProfileImage[]);
          }
        } else {
          setImages(imagesData as ProfileImage[]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!id) return;
    try {
      const { data: meUser } = await supabase.auth.getUser();
      if (!meUser?.user) return;
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', meUser.user.id)
        .eq('profile_id', id)
        .limit(1);
      if (data && data.length > 0) {
        setIsFavorite(true);
      } else {
        setIsFavorite(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFavorite = async () => {
    if (!id || favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      const { data: meUser } = await supabase.auth.getUser();
      if (!meUser?.user) return;
      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', meUser.user.id)
          .eq('profile_id', id);
        if (!error) {
          setIsFavorite(false);
        } else {
          Alert.alert('Error', error.message);
        }
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: meUser.user.id,
            profile_id: id,
          });
        if (!error) {
          setIsFavorite(true);
        } else {
          Alert.alert('Error', error.message);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
    checkFavoriteStatus();
  }, [id]);

  const calculateAge = (dobString: string) => {
    if (!dobString) return '';
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B1E3F" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Profile not found or access denied.</Text>
        <TouchableOpacity style={styles.backButtonText} onPress={handleBack}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const age = calculateAge(profile.dob);

  const displayedImages = images.length > 0
    ? images
    : (profile.cover_image_path
        ? [{ id: 'cover', storage_path: profile.cover_image_path, is_cover: true, sort_order: 0, signed_url: signedCoverUrl }]
        : []
      );

  const handleNextPhoto = () => {
    if (activeImageIndex < displayedImages.length - 1) {
      const nextIdx = activeImageIndex + 1;
      setActiveImageIndex(nextIdx);
      scrollViewRef.current?.scrollTo({ x: nextIdx * SCREEN_WIDTH, animated: true });
    }
  };

  const handlePrevPhoto = () => {
    if (activeImageIndex > 0) {
      const prevIdx = activeImageIndex - 1;
      setActiveImageIndex(prevIdx);
      scrollViewRef.current?.scrollTo({ x: prevIdx * SCREEN_WIDTH, animated: true });
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of ManaPelli?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          if (propOnBack) propOnBack();
        } 
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {profile.full_name}'s Biodata
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteHeaderBtn} disabled={favoriteLoading}>
            <Text style={styles.favoriteHeaderBtnText}>{isFavorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutHeaderBtn}>
            <Text style={styles.signOutHeaderText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Images Carousel */}
        <View style={styles.carouselContainer}>
          {displayedImages.length > 0 ? (
            <View style={{ position: 'relative', width: '100%', height: 350 }}>
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
                {displayedImages.map((img) => (
                  <Image
                    key={img.id}
                    source={{ uri: img.signed_url || '' }}
                    style={styles.carouselImage}
                    contentFit="cover"
                  />
                ))}
              </ScrollView>

              {/* Prev / Next Arrow Overlays */}
              {displayedImages.length > 1 && (
                <>
                  {activeImageIndex > 0 && (
                    <TouchableOpacity
                      style={[styles.arrowOverlay, styles.leftArrow]}
                      onPress={handlePrevPhoto}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.arrowText}>‹</Text>
                    </TouchableOpacity>
                  )}
                  {activeImageIndex < displayedImages.length - 1 && (
                    <TouchableOpacity
                      style={[styles.arrowOverlay, styles.rightArrow]}
                      onPress={handleNextPhoto}
                      activeOpacity={0.7}
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
            <View style={[styles.carouselImage, styles.placeholderImage]}>
              <Text style={styles.placeholderIcon}>❦</Text>
              <Text style={styles.placeholderText}>No Photos Available</Text>
            </View>
          )}

          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Human Verified</Text>
          </View>
        </View>

        {/* Content Card */}
        <View style={styles.detailsCard}>
          <View style={styles.profileHeading}>
            <Text style={styles.fullName}>
              {profile.full_name}, <Text style={styles.age}>{age}</Text>
            </Text>
            <Text style={styles.occupationText}>
              {profile.occupation || 'Not specified'}
            </Text>
            <Text style={styles.communityText}>
              🌿 {profile.community || 'Community Not Specified'}
            </Text>
          </View>

          {/* Section: Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Personal Details</Text>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>{formatDate(profile.dob)}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.infoLabel}>Gender</Text>
                <Text style={styles.infoValue}>{profile.gender}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.infoLabel}>Lives In</Text>
                <Text style={styles.infoValue}>{profile.current_place || 'Not Specified'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.infoLabel}>Native Place</Text>
                <Text style={styles.infoValue}>{profile.native_place || 'Not Specified'}</Text>
              </View>
            </View>
          </View>

          {/* Section: Profession & Income */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Education & Career</Text>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.infoLabel}>Profession</Text>
                <Text style={styles.infoValue}>{profile.occupation || 'Not Specified'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.infoLabel}>Annual Income</Text>
                <Text style={styles.infoValue}>
                  {formatSalary(profile.salary, profile.salary_currency)}
                </Text>
              </View>
            </View>
          </View>

          {/* Section: Preferences */}
          {profile.partner_preferences && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Partner Preferences</Text>
              <Text style={styles.preferencesText}>
                {profile.partner_preferences}
              </Text>
            </View>
          )}

          {/* Section: Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Contact Information</Text>
            <View style={styles.contactContainer}>
              <Text style={styles.contactDisclaimer}>
                Authorized members of your bureau can see contact details below:
              </Text>
              
              <View style={styles.contactRow}>
                <Text style={styles.contactRowLabel}>Phone:</Text>
                <Text style={styles.contactRowValue}>
                  {profile.phone || 'Unavailable / Managed by Bureau'}
                </Text>
              </View>
              <View style={styles.contactRow}>
                <Text style={styles.contactRowLabel}>Email:</Text>
                <Text style={styles.contactRowValue}>
                  {profile.email || 'Unavailable / Managed by Bureau'}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Back Navigation */}
          <TouchableOpacity style={styles.bottomBackButton} onPress={handleBack}>
            <Text style={styles.bottomBackButtonText}>← Back to Matches</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
  },
  header: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 24,
    color: '#8B1E3F',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C1B1F',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  signOutHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3CFCF',
    backgroundColor: '#FFFFFF',
  },
  signOutHeaderText: {
    color: '#B23B3B',
    fontSize: 12,
    fontWeight: '600',
  },
  favoriteHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  favoriteHeaderBtnText: {
    fontSize: 14,
  },
  bottomBackButton: {
    backgroundColor: '#8B1E3F',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#8B1E3F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  bottomBackButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
  },
  carouselContainer: {
    height: 350,
    backgroundColor: '#EFEAE2',
    position: 'relative',
  },
  arrowOverlay: {
    position: 'absolute',
    top: '40%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  leftArrow: {
    left: 16,
  },
  rightArrow: {
    right: 16,
  },
  arrowText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 34,
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: 350,
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3ECE0',
  },
  placeholderIcon: {
    fontSize: 72,
    color: '#D4C5B3',
  },
  placeholderText: {
    fontSize: 16,
    color: '#998E90',
    marginTop: 12,
    fontWeight: '500',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#8B1E3F',
    width: 20,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(46, 125, 50, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    minHeight: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  profileHeading: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE2',
    paddingBottom: 20,
    marginBottom: 24,
  },
  fullName: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2C1B1F',
  },
  age: {
    fontWeight: 'normal',
    color: '#706064',
  },
  occupationText: {
    fontSize: 16,
    color: '#706064',
    marginTop: 6,
  },
  communityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B1E3F',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 18,
    fontWeight: '600',
    color: '#2C1B1F',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 11,
    color: '#998E90',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#2C1B1F',
    fontWeight: '500',
    marginTop: 4,
  },
  preferencesText: {
    fontSize: 14,
    color: '#706064',
    lineHeight: 22,
    backgroundColor: '#FCFAF6',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    borderRadius: 16,
    padding: 16,
  },
  contactContainer: {
    backgroundColor: '#FCFAF6',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    borderRadius: 16,
    padding: 16,
  },
  contactDisclaimer: {
    fontSize: 12,
    color: '#706064',
    lineHeight: 18,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  contactRowLabel: {
    width: 60,
    fontSize: 13,
    fontWeight: '600',
    color: '#998E90',
  },
  contactRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C1B1F',
  },
  errorText: {
    fontSize: 16,
    color: '#706064',
    marginBottom: 16,
  },
  backButtonText: {
    backgroundColor: '#8B1E3F',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backLinkText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
