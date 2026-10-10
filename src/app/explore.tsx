import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { SupportModal } from '../components/support-modal';
import { HEIGHT_OPTIONS, POPULAR_CURRENCIES, formatSalary, getCurrencySymbol } from '../lib/formatters';

const STORAGE_URL = 'https://npvmvqminzgbuxibonta.supabase.co/storage/v1/object/public/profile-images/';

export default function MyProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, signOut, refreshProfile, loading: authLoading } = useAuth();
  const [bureauName, setBureauName] = useState('My Bureau');
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [supportVisible, setSupportVisible] = useState(false);
  const [signedCoverUrl, setSignedCoverUrl] = useState<string | null>(null);

  const [profileImages, setProfileImages] = useState<{id: string; storage_path: string; is_cover: boolean; sort_order: number; signedUrl?: string}[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form edit states
  const [currentPlace, setCurrentPlace] = useState('');
  const [nativePlace, setNativePlace] = useState('');
  const [occupation, setOccupation] = useState('');
  const [salary, setSalary] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState('INR');
  const [height, setHeight] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [fatherOccupation, setFatherOccupation] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherOccupation, setMotherOccupation] = useState('');
  const [siblingsCount, setSiblingsCount] = useState(0);
  const [siblings, setSiblings] = useState<{ name: string; occupation: string }[]>([]);
  const [partnerPreferences, setPartnerPreferences] = useState('');

  const [showHeightModal, setShowHeightModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

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

  useEffect(() => {
    if (profile) {
      fetchBureauDetails(profile.bureau_id);
    }
  }, [profile]);

  useEffect(() => {
    const fetchSignedCover = async () => {
      if (profile?.cover_image_path) {
        const { data } = await supabase
          .storage
          .from('profile-images')
          .createSignedUrl(profile.cover_image_path, 3600);
        if (data) {
          setSignedCoverUrl(data.signedUrl);
        }
      }
    };
    fetchSignedCover();
  }, [profile]);

  useEffect(() => {
    if (profile) {
      fetchProfileImages();
    }
  }, [profile?.id]);

  const handleSiblingsCountChange = (count: number) => {
    setSiblingsCount(count);
    setSiblings((prev) => {
      const next = [...prev];
      if (count > next.length) {
        for (let i = next.length; i < count; i++) {
          next.push({ name: '', occupation: '' });
        }
      } else {
        next.splice(count);
      }
      return next;
    });
  };

  const handleSiblingFieldChange = (index: number, field: 'name' | 'occupation', value: string) => {
    setSiblings((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleStartEditing = () => {
    if (!profile) return;
    setCurrentPlace(profile.current_place || '');
    setNativePlace(profile.native_place || '');
    setOccupation(profile.occupation || '');
    setSalary(profile.salary ? String(profile.salary) : '');
    setSalaryCurrency(profile.salary_currency || 'INR');
    setHeight(profile.height || '');
    setFatherName(profile.father_name || '');
    setFatherOccupation(profile.father_occupation || '');
    setMotherName(profile.mother_name || '');
    setMotherOccupation(profile.mother_occupation || '');
    setSiblingsCount(profile.siblings_count || 0);
    setSiblings(
      Array.isArray(profile.siblings)
        ? profile.siblings.map((s) => ({ name: s?.name || '', occupation: s?.occupation || '' }))
        : []
    );
    setPartnerPreferences(profile.partner_preferences || '');
    setIsEditing(true);
  };

  const handleSaveChanges = async () => {
    if (!profile) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          current_place: currentPlace || null,
          native_place: nativePlace || null,
          occupation: occupation || null,
          salary: salary ? Number(salary) : null,
          salary_currency: salaryCurrency || 'INR',
          height: height || null,
          father_name: fatherName || null,
          father_occupation: fatherOccupation || null,
          mother_name: motherName || null,
          mother_occupation: motherOccupation || null,
          siblings_count: siblingsCount,
          siblings: siblings,
          partner_preferences: partnerPreferences || null,
        })
        .eq('id', profile.id);

      if (error) {
        Alert.alert('Update Failed', error.message);
      } else {
        await refreshProfile();
        Alert.alert('Success', 'Your biodata has been updated');
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of ManaPelli?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your matrimony account? This will erase your entire profile, preferences, photos, and login credentials. This action is irreversible.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Account', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('delete_user_account');
              if (error) {
                Alert.alert('Error', error.message);
              } else {
                Alert.alert('Account Deleted', 'Your matrimony account has been permanently deleted.');
                await signOut();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'An error occurred during deletion.');
            }
          }
        }
      ]
    );
  };

  const fetchProfileImages = async () => {
    if (!profile) return;
    setLoadingPhotos(true);
    try {
      const { data: rawProf } = await supabase
        .from('profiles')
        .select('cover_image_path, image_paths')
        .eq('id', profile.id)
        .maybeSingle();

      const { data } = await supabase
        .from('profile_images')
        .select('id, storage_path, is_cover, sort_order')
        .eq('profile_id', profile.id)
        .order('sort_order');

      const allPaths: string[] = [];
      if (profile.cover_image_path) allPaths.push(profile.cover_image_path);
      if (rawProf?.cover_image_path && !allPaths.includes(rawProf.cover_image_path)) {
        allPaths.push(rawProf.cover_image_path);
      }
      if (Array.isArray(rawProf?.image_paths)) {
        rawProf.image_paths.forEach((p: string) => {
          if (p && typeof p === 'string' && !allPaths.includes(p)) allPaths.push(p);
        });
      }
      if (data && Array.isArray(data)) {
        data.forEach((img: any) => {
          if (img.storage_path && !allPaths.includes(img.storage_path)) allPaths.push(img.storage_path);
        });
      }

      if (allPaths.length === 0) {
        setProfileImages([]);
        setLoadingPhotos(false);
        return;
      }

      const { data: signedData } = await supabase.storage
        .from('profile-images')
        .createSignedUrls(allPaths, 3600);

      const urlMap = new Map<string, string>();
      if (signedData) {
        signedData.forEach((item: any, i: number) => {
          if (item?.signedUrl) urlMap.set(allPaths[i], item.signedUrl);
        });
      }

      const mergedImages = allPaths.map((path, idx) => {
        const existing = data?.find((d: any) => d.storage_path === path);
        return {
          id: existing?.id || `img-${idx}`,
          storage_path: path,
          is_cover: idx === 0 || existing?.is_cover || false,
          sort_order: existing?.sort_order ?? idx,
          signedUrl: urlMap.get(path) || null,
        };
      });

      setProfileImages(mergedImages as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleUploadPhoto = async () => {
    if (!profile) return;
    if (profileImages.length >= 5) {
      Alert.alert('Limit Reached', 'Maximum 5 photos allowed per profile');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return;

    setUploadingPhoto(true);
    try {
      const uri = result.assets[0].uri;
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          const reader = new FileReader();
          reader.onloadend = function () {
            try {
              const res = reader.result as string;
              const base64Data = res.split(',')[1];
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let j = 0; j < binaryString.length; j++) {
                bytes[j] = binaryString.charCodeAt(j);
              }
              resolve(bytes.buffer);
            } catch (err) { reject(err); }
          };
          reader.onerror = reject;
          reader.readAsDataURL(xhr.response);
        };
        xhr.onerror = reject;
        xhr.responseType = 'blob';
        xhr.open('GET', uri, true);
        xhr.send(null);
      });

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `${profile.bureau_id}/${profile.id}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(storagePath, arrayBuffer, { contentType: 'image/jpeg', cacheControl: '3600' });

      if (uploadError) {
        Alert.alert('Upload Failed', uploadError.message);
        return;
      }

      const isFirst = profileImages.length === 0;
      const { error: dbError } = await supabase.from('profile_images').insert({
        profile_id: profile.id,
        bureau_id: profile.bureau_id,
        storage_path: storagePath,
        sort_order: profileImages.length,
        is_cover: isFirst,
      });

      if (dbError) {
        await supabase.storage.from('profile-images').remove([storagePath]);
        Alert.alert('Error', dbError.message);
        return;
      }

      if (isFirst) {
        await supabase.from('profiles').update({ cover_image_path: storagePath }).eq('id', profile.id);
        await refreshProfile();
      }

      Alert.alert('Success', 'Photo uploaded successfully');
      await fetchProfileImages();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSetCover = async (imgId: string, path: string) => {
    if (!profile) return;
    try {
      await supabase.from('profile_images').update({ is_cover: false }).eq('profile_id', profile.id);
      await supabase.from('profile_images').update({ is_cover: true }).eq('id', imgId);
      await supabase.from('profiles').update({ cover_image_path: path }).eq('id', profile.id);
      await refreshProfile();
      await fetchProfileImages();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to set cover photo');
    }
  };

  const handleDeletePhoto = async (imgId: string, path: string, wasCover: boolean) => {
    Alert.alert('Delete Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.storage.from('profile-images').remove([path]);
            await supabase.from('profile_images').delete().eq('id', imgId);
            if (wasCover) {
              await supabase.from('profiles').update({ cover_image_path: null }).eq('id', profile!.id);
              await refreshProfile();
            }
            await fetchProfileImages();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete photo');
          }
        },
      },
    ]);
  };

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

  if (authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B1E3F" />
      </View>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>No matrimony profile found for this account.</Text>
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const age = calculateAge(profile.dob);
  const imageUri = signedCoverUrl || null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={styles.bureauBadge}>
            <Text style={styles.bureauBadgeText}>{bureauName}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 30, 60) }]}>
          {/* Profile Card Header */}
          <View style={styles.profileHeaderCard}>
            <View style={styles.avatarContainer}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.avatar} contentFit="cover" contentPosition="top center" />
              ) : (
                <View style={[styles.avatar, styles.placeholderAvatar]}>
                  <Text style={styles.placeholderIcon}>❦</Text>
                </View>
              )}
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {profile.status.toUpperCase()}
                </Text>
              </View>
            </View>
            
            <Text style={styles.profileName}>
              {profile.full_name}, <Text style={styles.profileAge}>{age}</Text>
            </Text>
            <Text style={styles.profileSub}>{profile.occupation || 'Private Service'}</Text>
            <Text style={styles.communityTag}>🌿 {profile.community || 'Community'}</Text>

            {!isEditing && (
              <TouchableOpacity style={styles.editBtn} onPress={handleStartEditing}>
                <Text style={styles.editBtnText}>Edit Biodata</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Section: Profile Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>
              {isEditing ? 'Edit Biodata Details' : 'My Biodata Details'}
            </Text>

            {isEditing ? (
              <View style={styles.editForm}>
                <Text style={styles.editLabel}>Height</Text>
                <TouchableOpacity
                  style={styles.selectBtn}
                  onPress={() => setShowHeightModal(true)}
                >
                  <Text style={height ? styles.selectBtnText : styles.selectBtnPlaceholder}>
                    {height || 'Select Height'}
                  </Text>
                  <Text style={styles.selectChevron}>▼</Text>
                </TouchableOpacity>

                <Text style={styles.editLabel}>Current City / Location *</Text>
                <TextInput
                  style={styles.editInput}
                  value={currentPlace}
                  onChangeText={setCurrentPlace}
                  placeholder="e.g. Sydney, Hyderabad"
                  placeholderTextColor="#999"
                />

                <Text style={styles.editLabel}>Native Place (Hometown)</Text>
                <TextInput
                  style={styles.editInput}
                  value={nativePlace}
                  onChangeText={setNativePlace}
                  placeholder="e.g. Karimnagar"
                  placeholderTextColor="#999"
                />

                <Text style={styles.editLabel}>Occupation *</Text>
                <TextInput
                  style={styles.editInput}
                  value={occupation}
                  onChangeText={setOccupation}
                  placeholder="e.g. Software Engineer"
                  placeholderTextColor="#999"
                />

                <Text style={styles.editLabel}>Annual Income</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.selectBtn, { width: 100 }]}
                    onPress={() => setShowCurrencyModal(true)}
                  >
                    <Text style={styles.selectBtnText}>
                      {getCurrencySymbol(salaryCurrency)} {salaryCurrency}
                    </Text>
                    <Text style={styles.selectChevron}>▼</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.editInput, { flex: 1 }]}
                    value={salary}
                    onChangeText={setSalary}
                    placeholder="e.g. 1500000"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>

                {/* Family Details Edit */}
                <Text style={[styles.editSectionSubtitle, { marginTop: 16 }]}>Family Details</Text>
                
                <Text style={styles.editLabel}>Father's Name</Text>
                <TextInput
                  style={styles.editInput}
                  value={fatherName}
                  onChangeText={setFatherName}
                  placeholder="Father's Full Name"
                  placeholderTextColor="#999"
                />

                <Text style={styles.editLabel}>Father's Occupation</Text>
                <TextInput
                  style={styles.editInput}
                  value={fatherOccupation}
                  onChangeText={setFatherOccupation}
                  placeholder="e.g. Business / Retired"
                  placeholderTextColor="#999"
                />

                <Text style={styles.editLabel}>Mother's Name</Text>
                <TextInput
                  style={styles.editInput}
                  value={motherName}
                  onChangeText={setMotherName}
                  placeholder="Mother's Full Name"
                  placeholderTextColor="#999"
                />

                <Text style={styles.editLabel}>Mother's Occupation</Text>
                <TextInput
                  style={styles.editInput}
                  value={motherOccupation}
                  onChangeText={setMotherOccupation}
                  placeholder="e.g. Homemaker"
                  placeholderTextColor="#999"
                />

                <Text style={styles.editLabel}>Number of Siblings</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {[0, 1, 2, 3, 4, 5].map((cnt) => (
                    <TouchableOpacity
                      key={cnt}
                      onPress={() => handleSiblingsCountChange(cnt)}
                      style={[
                        styles.siblingCountChip,
                        siblingsCount === cnt && styles.siblingCountChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.siblingCountChipText,
                          siblingsCount === cnt && styles.siblingCountChipTextActive,
                        ]}
                      >
                        {cnt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {siblings.map((sib, index) => (
                  <View key={index} style={styles.siblingBox}>
                    <Text style={styles.siblingTitle}>Sibling #{index + 1}</Text>
                    <TextInput
                      style={styles.editInput}
                      value={sib.name}
                      onChangeText={(val) => handleSiblingFieldChange(index, 'name', val)}
                      placeholder="Sibling Name"
                      placeholderTextColor="#999"
                    />
                    <TextInput
                      style={styles.editInput}
                      value={sib.occupation}
                      onChangeText={(val) => handleSiblingFieldChange(index, 'occupation', val)}
                      placeholder="Sibling Occupation"
                      placeholderTextColor="#999"
                    />
                  </View>
                ))}

                <Text style={styles.editLabel}>Partner Preferences</Text>
                <TextInput
                  style={[styles.editInput, styles.editTextArea]}
                  value={partnerPreferences}
                  onChangeText={setPartnerPreferences}
                  placeholder="Describe your partner expectations..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                />

                <View style={styles.editBtnRow}>
                  <TouchableOpacity 
                    style={styles.cancelBtn} 
                    onPress={() => setIsEditing(false)}
                    disabled={updating}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.saveBtn} 
                    onPress={handleSaveChanges}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{profile.email || 'Not specified'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{profile.phone || 'Not specified'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date of Birth</Text>
                  <Text style={styles.detailValue}>{formatDate(profile.dob)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Height</Text>
                  <Text style={styles.detailValue}>{profile.height || 'Not specified'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Lives In</Text>
                  <Text style={styles.detailValue}>{profile.current_place || 'Not specified'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Native Place</Text>
                  <Text style={styles.detailValue}>{profile.native_place || 'Not specified'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Annual Income</Text>
                  <Text style={styles.detailValue}>
                    {formatSalary(profile.salary, profile.salary_currency)}
                  </Text>
                </View>

                {profile.partner_preferences && (
                  <View style={styles.prefBlock}>
                    <Text style={styles.detailLabel}>Partner Preferences</Text>
                    <Text style={styles.prefText}>{profile.partner_preferences}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Family Details View Section */}
          {!isEditing && (
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Family Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Father's Name</Text>
                <Text style={styles.detailValue}>{profile.father_name || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Father's Occupation</Text>
                <Text style={styles.detailValue}>{profile.father_occupation || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mother's Name</Text>
                <Text style={styles.detailValue}>{profile.mother_name || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mother's Occupation</Text>
                <Text style={styles.detailValue}>{profile.mother_occupation || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Siblings</Text>
                <Text style={styles.detailValue}>{profile.siblings_count ?? 0}</Text>
              </View>
              {profile.siblings && profile.siblings.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  {profile.siblings.map((sib, i) => (
                    <View key={i} style={styles.siblingViewCard}>
                      <Text style={styles.siblingViewTitle}>Sibling {i + 1}</Text>
                      <Text style={styles.siblingViewText}>Name: {sib.name || '—'}</Text>
                      <Text style={styles.siblingViewText}>Occupation: {sib.occupation || '—'}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* My Photos Section */}
          {!isEditing && (
            <View style={styles.detailsSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F5ECE2', paddingBottom: 10 }}>
                <Text style={styles.sectionTitle}>My Photos</Text>
                <Text style={{ fontSize: 13, color: '#998E90' }}>{profileImages.length}/5</Text>
              </View>

              {loadingPhotos ? (
                <ActivityIndicator size="small" color="#8B1E3F" style={{ marginVertical: 20 }} />
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {profileImages.map((img) => (
                    <View key={img.id} style={{ width: '47%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#EFEAE2', position: 'relative' }}>
                      {img.signedUrl ? (
                        <Image source={{ uri: img.signedUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      ) : (
                        <View style={{ width: '100%', height: '100%', backgroundColor: '#F5F0EA', alignItems: 'center', justifyContent: 'center' }}>
                          <ActivityIndicator size="small" color="#8B1E3F" />
                        </View>
                      )}
                      {img.is_cover && (
                        <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: '#8B1E3F', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Cover</Text>
                        </View>
                      )}
                      <View style={{ position: 'absolute', bottom: 6, right: 6, flexDirection: 'row', gap: 6 }}>
                        {!img.is_cover && (
                          <TouchableOpacity
                            onPress={() => handleSetCover(img.id, img.storage_path)}
                            style={{ backgroundColor: 'rgba(255,255,255,0.9)', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 }}
                          >
                            <Text style={{ fontSize: 14 }}>⭐</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => handleDeletePhoto(img.id, img.storage_path, img.is_cover)}
                          style={{ backgroundColor: 'rgba(178,59,59,0.9)', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 }}
                        >
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {profileImages.length < 5 && (
                    <TouchableOpacity
                      onPress={handleUploadPhoto}
                      disabled={uploadingPhoto}
                      style={{ width: '47%', aspectRatio: 1, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#EFEAE2', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCFAF6' }}
                    >
                      {uploadingPhoto ? (
                        <ActivityIndicator size="small" color="#8B1E3F" />
                      ) : (
                        <>
                          <Text style={{ fontSize: 28, color: '#8B1E3F', marginBottom: 4 }}>+</Text>
                          <Text style={{ fontSize: 11, color: '#998E90', fontWeight: '500' }}>Add Photo</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Sign Out Button */}
          {!isEditing && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.supportBtn}
                onPress={() => setSupportVisible(true)}
              >
                <Text style={styles.supportBtnText}>Contact Support Form</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                <Text style={styles.signOutBtnText}>Sign Out of App</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount}>
                <Text style={styles.deleteAccountBtnText}>Delete Matrimony Account</Text>
              </TouchableOpacity>
              <Text style={styles.versionText}>ManaPelli Matrimony v1.0.0</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <SupportModal
        visible={supportVisible}
        onClose={() => setSupportVisible(false)}
        prefilledName={profile.full_name || ''}
        prefilledEmail={profile.email || ''}
        prefilledPhone={profile.phone || ''}
      />

      {/* Height Selector Modal */}
      <Modal visible={showHeightModal} animationType="slide" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowHeightModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Height</Text>
              <TouchableOpacity onPress={() => setShowHeightModal(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={HEIGHT_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, height === item.value && styles.modalItemSelected]}
                  onPress={() => {
                    setHeight(item.value);
                    setShowHeightModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, height === item.value && styles.modalItemTextSelected]}>
                    {item.label}
                  </Text>
                  {height === item.value && <Text style={styles.modalCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Currency Selector Modal */}
      <Modal visible={showCurrencyModal} animationType="slide" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCurrencyModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={POPULAR_CURRENCIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, salaryCurrency === item.code && styles.modalItemSelected]}
                  onPress={() => {
                    setSalaryCurrency(item.code);
                    setShowCurrencyModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, salaryCurrency === item.code && styles.modalItemTextSelected]}>
                    {item.label}
                  </Text>
                  {salaryCurrency === item.code && <Text style={styles.modalCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  keyboardView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
    padding: 20,
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
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C1B1F',
  },
  bureauBadge: {
    backgroundColor: '#FAF0E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0E6D8',
  },
  bureauBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B1E3F',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#FAF0E6',
  },
  placeholderAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3ECE0',
  },
  placeholderIcon: {
    fontSize: 36,
    color: '#D4C5B3',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  profileName: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 24,
    fontWeight: '700',
    color: '#2C1B1F',
  },
  profileAge: {
    fontWeight: 'normal',
    color: '#706064',
  },
  profileSub: {
    fontSize: 14,
    color: '#706064',
    marginTop: 4,
  },
  communityTag: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B1E3F',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  editBtn: {
    marginTop: 16,
    backgroundColor: '#FCFAF6',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
  },
  editBtnText: {
    color: '#8B1E3F',
    fontSize: 13,
    fontWeight: '600',
  },
  detailsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 18,
    fontWeight: '600',
    color: '#2C1B1F',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECE2',
    paddingBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF8F5',
  },
  detailLabel: {
    fontSize: 13,
    color: '#998E90',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#2C1B1F',
    fontWeight: '600',
  },
  prefBlock: {
    marginTop: 16,
  },
  prefText: {
    fontSize: 14,
    color: '#706064',
    lineHeight: 20,
    marginTop: 8,
    backgroundColor: '#FCFAF6',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  signOutBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3CFCF',
    borderRadius: 12,
    height: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  signOutBtnText: {
    color: '#B23B3B',
    fontSize: 15,
    fontWeight: '600',
  },
  supportBtn: {
    backgroundColor: '#8B1E3F',
    borderRadius: 12,
    height: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#8B1E3F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  supportBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  versionText: {
    fontSize: 11,
    color: '#998E90',
    marginTop: 16,
  },
  deleteAccountBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3CFCF',
    borderRadius: 12,
    height: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  deleteAccountBtnText: {
    color: '#B23B3B',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#706064',
    marginBottom: 20,
    textAlign: 'center',
  },
  // Edit mode styles
  editForm: {},
  editLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#706064',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#2C1B1F',
    backgroundColor: '#FCFAF6',
    marginBottom: 16,
  },
  editTextArea: {
    height: 100,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  editBtnRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3CFCF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {
    color: '#8B1E3F',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#8B1E3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  selectBtn: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FCFAF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  selectBtnText: {
    fontSize: 14,
    color: '#2C1B1F',
  },
  selectBtnPlaceholder: {
    fontSize: 14,
    color: '#999',
  },
  selectChevron: {
    fontSize: 10,
    color: '#8B1E3F',
  },
  editSectionSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8B1E3F',
    marginBottom: 12,
  },
  siblingCountChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    backgroundColor: '#FCFAF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  siblingCountChipActive: {
    backgroundColor: '#8B1E3F',
    borderColor: '#8B1E3F',
  },
  siblingCountChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  siblingCountChipTextActive: {
    color: '#FFFFFF',
  },
  siblingBox: {
    backgroundColor: '#FAF5EE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  siblingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B1E3F',
    marginBottom: 8,
  },
  siblingViewCard: {
    backgroundColor: '#FCFAF6',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  siblingViewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B1E3F',
    marginBottom: 2,
  },
  siblingViewText: {
    fontSize: 13,
    color: '#4A3E3D',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE2',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C1B1F',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B1E3F',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0EA',
  },
  modalItemSelected: {
    backgroundColor: '#FFF8F6',
  },
  modalItemText: {
    fontSize: 15,
    color: '#2C1B1F',
  },
  modalItemTextSelected: {
    fontWeight: '700',
    color: '#8B1E3F',
  },
  modalCheck: {
    fontSize: 16,
    color: '#8B1E3F',
    fontWeight: 'bold',
  },
});
