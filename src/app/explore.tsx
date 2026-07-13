import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { SupportModal } from '../components/support-modal';

const STORAGE_URL = 'https://npvmvqminzgbuxibonta.supabase.co/storage/v1/object/public/profile-images/';

export default function MyProfileScreen() {
  const { profile, signOut, refreshProfile, loading: authLoading } = useAuth();
  const [bureauName, setBureauName] = useState('My Bureau');
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [supportVisible, setSupportVisible] = useState(false);
  const [signedCoverUrl, setSignedCoverUrl] = useState<string | null>(null);

  // Form edit states
  const [currentPlace, setCurrentPlace] = useState('');
  const [nativePlace, setNativePlace] = useState('');
  const [occupation, setOccupation] = useState('');
  const [salary, setSalary] = useState('');
  const [partnerPreferences, setPartnerPreferences] = useState('');

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

  const handleStartEditing = () => {
    if (!profile) return;
    setCurrentPlace(profile.current_place || '');
    setNativePlace(profile.native_place || '');
    setOccupation(profile.occupation || '');
    setSalary(profile.salary ? String(profile.salary) : '');
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
      <SafeAreaView style={styles.container}>
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
    <SafeAreaView style={styles.container}>
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

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Profile Card Header */}
          <View style={styles.profileHeaderCard}>
            <View style={styles.avatarContainer}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.avatar} contentFit="cover" />
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

                <Text style={styles.editLabel}>Annual Income (INR/yr)</Text>
                <TextInput
                  style={styles.editInput}
                  value={salary}
                  onChangeText={setSalary}
                  placeholder="e.g. 1500000"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />

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
    paddingBottom: 40,
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
});
