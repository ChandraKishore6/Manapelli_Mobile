import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';

interface Community {
  id: string;
  name: string;
}

interface Bureau {
  id: string;
  name: string;
  location: string | null;
  profile_count?: number;
}

interface RegisterProfileProps {
  onShowLogin: () => void;
  // Support initial registration with details
  initialCommunityId?: string;
  initialBureauId?: string;
}

export default function RegisterProfileScreen({
  onShowLogin,
  initialCommunityId = '',
  initialBureauId = '',
}: RegisterProfileProps) {
  const [step, setStep] = useState(initialCommunityId ? 3 : 1);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loadingComms, setLoadingComms] = useState(true);
  const [bureaus, setBureaus] = useState<Bureau[]>([]);
  const [loadingBureaus, setLoadingBureaus] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form Fields
  const [selectedCommunityId, setSelectedCommunityId] = useState(initialCommunityId);
  const [selectedCommunityName, setSelectedCommunityName] = useState('');
  const [selectedBureauId, setSelectedBureauId] = useState(initialBureauId);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  
  // Date Picker States
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [dobDate, setDobDate] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nativePlace, setNativePlace] = useState('');
  const [currentPlace, setCurrentPlace] = useState('');
  const [occupation, setOccupation] = useState('');
  const [salary, setSalary] = useState('');
  const [partnerPreferences, setPartnerPreferences] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // Fetch Communities on mount
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const { data, error } = await supabase.rpc('list_communities');
        if (error) {
          console.error('Error listing communities:', error.message);
        } else if (data) {
          setCommunities(data as Community[]);
          if (initialCommunityId) {
            const matched = (data as Community[]).find((c) => c.id === initialCommunityId);
            if (matched) setSelectedCommunityName(matched.name);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingComms(false);
      }
    };
    fetchCommunities();
  }, [initialCommunityId]);

  // Fetch bureaus that serve the selected community
  const fetchBureausForCommunity = async (communityId: string) => {
    setLoadingBureaus(true);
    setBureaus([]);
    if (!initialBureauId) {
      setSelectedBureauId('');
    }
    try {
      const { data, error } = await supabase.rpc('list_public_bureaus_by_community', {
        _community_id: communityId,
      });

      if (error) {
        console.error('Error listing public bureaus for community:', error.message);
      } else if (data) {
        setBureaus(data as Bureau[]);
        if (data.length > 0 && !initialBureauId) {
          setSelectedBureauId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBureaus(false);
    }
  };

  useEffect(() => {
    if (selectedCommunityId) {
      fetchBureausForCommunity(selectedCommunityId);
    }
  }, [selectedCommunityId]);

  const handleNextStep = () => {
    if (step === 1 && !selectedCommunityId) {
      Alert.alert('Error', 'Please select your community');
      return;
    }
    if (step === 2 && !selectedBureauId) {
      Alert.alert('Error', 'Please choose a marriage bureau');
      return;
    }
    if (step === 3) {
      if (!fullName || !dob || !email || !phone || !password) {
        Alert.alert('Error', 'Please fill in all required personal details');
        return;
      }
    }
    if (step === 4 && (!currentPlace || !occupation)) {
      Alert.alert('Error', 'Please fill in your current location and occupation');
      return;
    }
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    // If we started with a preselected community (step 3), don't go back past step 3
    if (initialCommunityId && step === 3) {
      onShowLogin();
      return;
    }
    setStep(step - 1);
  };

  const handlePickPhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload up to 5 photos only');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please grant photo gallery permission in your settings');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedUri = result.assets[0].uri;
      setPhotos((prev) => [...prev, selectedUri]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const onChangeDob = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDobDate(selectedDate);
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}`;
      setDob(formatted);
    }
  };

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const profileId = generateUUID();

      // 1. Upload photos first (if any)
      const uploadedPaths: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const photoUri = photos[i];
        const response = await fetch(photoUri);
        const blob = await response.blob();
        
        const fileExt = photoUri.split('.').pop()?.toLowerCase() || 'jpg';
        const filename = `${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storagePath = `${profileId}/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(storagePath, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
          });

        if (uploadError) {
          console.error('Failed to upload photo:', uploadError.message);
        } else {
          uploadedPaths.push(storagePath);
        }
      }

      // 2. Submit the profile application with all details and photo paths in a single RPC transaction!
      const { data: resultId, error: submitError } = await supabase.rpc(
        'submit_profile_registration',
        {
          p_id: profileId,
          p_bureau_id: selectedBureauId,
          p_community_id: selectedCommunityId || null,
          p_full_name: fullName,
          p_dob: dob,
          p_gender: gender,
          p_email: email,
          p_phone: phone,
          p_last_password: password,
          p_community: selectedCommunityName,
          p_native_place: nativePlace || null,
          p_current_place: currentPlace,
          p_occupation: occupation,
          p_salary: salary ? Number(salary) : null,
          p_partner_preferences: partnerPreferences || null,
          p_image_paths: uploadedPaths,
        }
      );

      if (submitError) {
        Alert.alert('Submission Failed', submitError.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'An unexpected error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successBadge}>
            <Text style={styles.successBadgeIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Profile Submitted!</Text>
          <Text style={styles.successDescription}>
            Your profile details have been sent to your selected bureau for review. 
            Verification typically takes up to 24 hours.
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>
              Once approved, your credentials will be activated and you can sign in to view community matches.
            </Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={onShowLogin}>
            <Text style={styles.primaryBtnText}>Return to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handlePrevStep} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register Profile</Text>
          <Text style={styles.stepIndicator}>Step {step} of 6</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Step 1: Caste / Community Selection */}
          {step === 1 && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Select your Caste</Text>
              <Text style={styles.sectionSubtitle}>
                ManaPelli matches you within your own community. Please choose your caste to begin.
              </Text>

              {loadingComms ? (
                <ActivityIndicator size="large" color="#8B1E3F" style={{ alignSelf: 'center', marginVertical: 40 }} />
              ) : communities.length === 0 ? (
                <Text style={styles.errorText}>No active communities are currently configured.</Text>
              ) : (
                <View style={styles.commGrid}>
                  {communities.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.commChip,
                        selectedCommunityId === c.id && styles.commChipActive,
                      ]}
                      onPress={() => {
                        setSelectedCommunityId(c.id);
                        setSelectedCommunityName(c.name);
                      }}
                    >
                      <Text
                        style={[
                          styles.commChipText,
                          selectedCommunityId === c.id && styles.commChipTextActive,
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 24 }]}
                onPress={handleNextStep}
                disabled={!selectedCommunityId}
              >
                <Text style={styles.primaryBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: Bureau Selection */}
          {step === 2 && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Choose Your Bureau</Text>
              <Text style={styles.sectionSubtitle}>
                Select the marriage bureau serving your selected community ({selectedCommunityName}).
              </Text>

              {loadingBureaus ? (
                <ActivityIndicator size="large" color="#8B1E3F" style={{ alignSelf: 'center', marginVertical: 40 }} />
              ) : bureaus.length === 0 ? (
                <Text style={styles.errorText}>
                  No approved bureaus are currently serving the {selectedCommunityName} community.
                </Text>
              ) : (
                <View style={styles.bureauList}>
                  {bureaus.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.bureauItem,
                        selectedBureauId === b.id && styles.bureauItemActive,
                      ]}
                      onPress={() => setSelectedBureauId(b.id)}
                    >
                      <View style={styles.bureauRow}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.bureauName,
                              selectedBureauId === b.id && styles.bureauTextActive,
                            ]}
                          >
                            {b.name}
                          </Text>
                          {b.location && (
                            <Text
                              style={[
                                styles.bureauLocation,
                                selectedBureauId === b.id && styles.bureauLocationActive,
                              ]}
                            >
                              📍 {b.location}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.bureauProfileCount}>
                          👥 {b.profile_count || 0} profiles
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handlePrevStep}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
                  onPress={handleNextStep}
                  disabled={!selectedBureauId}
                >
                  <Text style={styles.primaryBtnText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 3: Personal Details */}
          {step === 3 && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Personal Details</Text>

              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter bride or groom's full name"
                placeholderTextColor="#999"
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.label}>Gender *</Text>
              <View style={styles.genderContainer}>
                {(['male', 'female'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
                      {g === 'male' ? 'Bridegroom' : 'Bride'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date of Birth Picker */}
              <Text style={styles.label}>Date of Birth *</Text>
              <TouchableOpacity
                style={styles.datePickerToggle}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.datePickerToggleText, !dob && { color: '#999' }]}>
                  {dob ? dob : 'Select Date of Birth (YYYY-MM-DD)'}
                </Text>
              </TouchableOpacity>

              {/* Android/iOS date pickers */}
              {showDatePicker && Platform.OS !== 'ios' && (
                <DateTimePicker
                  value={dobDate}
                  mode="date"
                  display="default"
                  maximumDate={new Date(new Date().getFullYear() - 18, 0, 1)} // 18+ years constraint
                  onChange={onChangeDob}
                />
              )}

              {/* iOS Picker in Modal */}
              {showDatePicker && Platform.OS === 'ios' && (
                <Modal transparent animationType="fade" visible={showDatePicker}>
                  <View style={styles.iosPickerOverlay}>
                    <View style={styles.iosPickerContainer}>
                      <DateTimePicker
                        value={dobDate}
                        mode="date"
                        display="spinner"
                        maximumDate={new Date(new Date().getFullYear() - 18, 0, 1)}
                        onChange={(event, date) => date && setDobDate(date)}
                      />
                      <TouchableOpacity
                        style={styles.iosPickerDoneBtn}
                        onPress={() => {
                          const year = dobDate.getFullYear();
                          const month = String(dobDate.getMonth() + 1).padStart(2, '0');
                          const day = String(dobDate.getDate()).padStart(2, '0');
                          const formatted = `${year}-${month}-${day}`;
                          setDob(formatted);
                          setShowDatePicker(false);
                        }}
                      >
                        <Text style={styles.iosPickerDoneText}>Confirm Date</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              )}

              <Text style={[styles.label, { marginTop: 14 }]}>Email Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Contact Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 XXXXX XXXXX"
                placeholderTextColor="#999"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Requested Account Password *</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Choose a password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handlePrevStep}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]} onPress={handleNextStep}>
                  <Text style={styles.primaryBtnText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 4: Professional & Background */}
          {step === 4 && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Biodata Details</Text>

              <Text style={styles.label}>Current City / Location *</Text>
              <TextInput
                style={styles.input}
                placeholder="Where do you live currently?"
                placeholderTextColor="#999"
                value={currentPlace}
                onChangeText={setCurrentPlace}
              />

              <Text style={styles.label}>Native Place (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Family's hometown/native place"
                placeholderTextColor="#999"
                value={nativePlace}
                onChangeText={setNativePlace}
              />

              <Text style={styles.label}>Occupation *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Software Engineer, Doctor"
                placeholderTextColor="#999"
                value={occupation}
                onChangeText={setOccupation}
              />

              <Text style={styles.label}>Annual Income (INR / yr - Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 1500000"
                placeholderTextColor="#999"
                value={salary}
                onChangeText={setSalary}
                keyboardType="numeric"
              />

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handlePrevStep}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]} onPress={handleNextStep}>
                  <Text style={styles.primaryBtnText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 5: Partner Preferences */}
          {step === 5 && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Partner Preferences</Text>
              <Text style={styles.sectionSubtitle}>
                Describe who you are looking for (age, education, or community).
              </Text>

              <Text style={styles.label}>Preferences Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Looking for a well-educated partner from our community..."
                placeholderTextColor="#999"
                value={partnerPreferences}
                onChangeText={setPartnerPreferences}
                multiline
                numberOfLines={6}
              />

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handlePrevStep}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]} onPress={handleNextStep}>
                  <Text style={styles.primaryBtnText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 6: Profile Photos */}
          {step === 6 && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Add Photos</Text>
              <Text style={styles.sectionSubtitle}>
                Upload up to 5 photos. The first image will be set as your cover photo.
              </Text>

              <View style={styles.photoGrid}>
                {photos.map((uri, idx) => (
                  <View key={idx} style={styles.photoWrapper}>
                    <Image source={{ uri }} style={styles.photoThumb} />
                    {idx === 0 && (
                      <View style={styles.coverLabel}>
                        <Text style={styles.coverLabelText}>COVER</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => handleRemovePhoto(idx)}
                    >
                      <Text style={styles.removePhotoText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {photos.length < 5 && (
                  <TouchableOpacity style={styles.addPhotoCard} onPress={handlePickPhoto}>
                    <Text style={styles.addPhotoCardIcon}>+</Text>
                    <Text style={styles.addPhotoCardText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handlePrevStep}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Submit Profile</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  stepIndicator: {
    fontSize: 12,
    color: '#998E90',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 22,
    fontWeight: '700',
    color: '#2C1B1F',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#706064',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  bureauList: {
    gap: 10,
    marginBottom: 20,
  },
  bureauItem: {
    backgroundColor: '#FCFAF6',
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 12,
    padding: 14,
  },
  bureauItemActive: {
    borderColor: '#8B1E3F',
    backgroundColor: '#FDF7F8',
  },
  bureauRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bureauName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C1B1F',
  },
  bureauTextActive: {
    color: '#8B1E3F',
  },
  bureauLocation: {
    fontSize: 12,
    color: '#998E90',
    marginTop: 4,
  },
  bureauLocationActive: {
    color: '#AA687C',
  },
  bureauProfileCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B1E3F',
  },
  commGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    justifyContent: 'center',
  },
  commChip: {
    backgroundColor: '#FCFAF6',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
  },
  commChipActive: {
    backgroundColor: '#8B1E3F',
    borderColor: '#8B1E3F',
  },
  commChipText: {
    fontSize: 14,
    color: '#706064',
    fontWeight: '500',
  },
  commChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#706064',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#2C1B1F',
    backgroundColor: '#FCFAF6',
    marginBottom: 20,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  genderBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCFAF6',
  },
  genderBtnActive: {
    borderColor: '#8B1E3F',
    backgroundColor: '#FDF7F8',
  },
  genderBtnText: {
    fontSize: 14,
    color: '#706064',
    fontWeight: '600',
  },
  genderBtnTextActive: {
    color: '#8B1E3F',
  },
  datePickerToggle: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#FCFAF6',
    marginBottom: 10,
  },
  datePickerToggleText: {
    fontSize: 15,
    color: '#2C1B1F',
  },
  iosPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  iosPickerDoneBtn: {
    marginTop: 20,
    backgroundColor: '#8B1E3F',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  iosPickerDoneText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: '#8B1E3F',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B1E3F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#706064',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#B23B3B',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 10,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
    justifyContent: 'center',
  },
  photoWrapper: {
    width: 80,
    height: 100,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  coverLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#8B1E3F',
    alignItems: 'center',
    paddingVertical: 2,
  },
  coverLabelText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addPhotoCard: {
    width: 80,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4C5B3',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCFAF6',
  },
  addPhotoCardIcon: {
    fontSize: 24,
    color: '#998E90',
    fontWeight: '300',
  },
  addPhotoCardText: {
    fontSize: 10,
    color: '#998E90',
    marginTop: 4,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successBadgeIcon: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  successTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C1B1F',
    marginBottom: 12,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 14,
    color: '#706064',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#EFE3D3',
    padding: 16,
    borderRadius: 16,
    marginBottom: 36,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#7C674F',
    lineHeight: 20,
    textAlign: 'center',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 12,
    backgroundColor: '#FCFAF6',
    paddingRight: 10,
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    color: '#2C1B1F',
    fontSize: 16,
  },
  eyeBtn: {
    padding: 10,
  },
  eyeText: {
    fontSize: 20,
  },
});
