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
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { HEIGHT_OPTIONS, POPULAR_CURRENCIES } from '../lib/formatters';
import { sendRegistrationOtp, verifyRegistrationOtp } from '../lib/otp-service';

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
  onShowWelcome: () => void;
  // Support initial registration with details
  initialCommunityId?: string;
  initialBureauId?: string;
}

export default function RegisterProfileScreen({
  onShowLogin,
  onShowWelcome,
  initialCommunityId = '',
  initialBureauId = '',
}: RegisterProfileProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(initialCommunityId ? 3 : 1);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loadingComms, setLoadingComms] = useState(true);
  const [bureaus, setBureaus] = useState<Bureau[]>([]);
  const [loadingBureaus, setLoadingBureaus] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [eulaAccepted, setEulaAccepted] = useState(false);
  const [allowCrossBureau, setAllowCrossBureau] = useState(true);

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

  // Step 1: Email OTP States
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Step 2: Password States
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [phone, setPhone] = useState('');
  const [height, setHeight] = useState('');
  const [showHeightModal, setShowHeightModal] = useState(false);
  const [nativePlace, setNativePlace] = useState('');
  const [currentPlace, setCurrentPlace] = useState('');
  const [occupation, setOccupation] = useState('');
  const [salary, setSalary] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState('INR');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [fatherName, setFatherName] = useState('');
  const [fatherOccupation, setFatherOccupation] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherOccupation, setMotherOccupation] = useState('');
  const [siblingsCount, setSiblingsCount] = useState('0');
  const [siblings, setSiblings] = useState<Array<{ name: string; occupation: string }>>([]);
  const [partnerPreferences, setPartnerPreferences] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // Community Request & Other States
  const [showRequestCommModal, setShowRequestCommModal] = useState(false);
  const [reqCommName, setReqCommName] = useState('');
  const [reqContact, setReqContact] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);
  const [communityOther, setCommunityOther] = useState('');

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setSendingOtp(true);
    try {
      const res = await sendRegistrationOtp(cleanEmail);
      if (!res.success) {
        if (res.isAlreadyRegistered) {
          Alert.alert(
            'Account Exists ⚠️',
            'An account with this email address already exists in ManaPelli. Please sign in.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Go to Sign In', onPress: () => onShowLogin() },
            ]
          );
        } else {
          Alert.alert('OTP Error', res.error || 'Failed to send verification code.');
        }
        return;
      }
      setEmail(res.email || cleanEmail);
      setOtpSent(true);
      setResendTimer(30);
      Alert.alert('Verification Code Sent 📩', `A 6-digit verification code has been sent to ${res.email || cleanEmail}.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP code sent to your email.');
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await verifyRegistrationOtp(email, cleanOtp);
      if (!res.success) {
        Alert.alert('Verification Failed', res.error || 'Invalid OTP code.');
        return;
      }
      setEmailVerified(true);
      Alert.alert('Email Verified! 🎉', 'Your email address has been verified successfully.');
      setStep(2);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to verify OTP code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmitCommunityRequest = async () => {
    if (!reqCommName.trim()) {
      Alert.alert('Required', 'Please enter a community name');
      return;
    }
    setSubmittingReq(true);
    try {
      const { error } = await supabase.from('community_requests').insert({
        community_name: reqCommName.trim(),
        contact_email: reqContact.includes('@') ? reqContact.trim() : null,
        contact_phone: !reqContact.includes('@') ? reqContact.trim() : null,
        notes: reqNotes.trim() || null,
        status: 'pending',
      });
      if (error) {
        Alert.alert('Submission Error', error.message);
      } else {
        Alert.alert(
          'Request Submitted',
          `Request for "${reqCommName.trim()}" submitted! Admin will review and add it.`
        );
        setReqCommName('');
        setReqContact('');
        setReqNotes('');
        setShowRequestCommModal(false);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit request');
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleSiblingsCountChange = (countStr: string) => {
    setSiblingsCount(countStr);
    const count = Math.max(0, parseInt(countStr, 10) || 0);
    setSiblings((prev) => {
      const next = [...prev];
      if (next.length < count) {
        for (let i = next.length; i < count; i++) {
          next.push({ name: '', occupation: '' });
        }
      } else {
        next.splice(count);
      }
      return next;
    });
  };

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
    if (step === 2) {
      if (!password || password.length < 6) {
        Alert.alert('Password Requirement', 'Please choose a login password of at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match. Please re-enter your password.');
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!selectedCommunityId) {
        Alert.alert('Community Required', 'Please select your community/caste.');
        return;
      }
      if (selectedCommunityName?.toLowerCase().includes('other') && !communityOther.trim()) {
        Alert.alert('Community Required', 'Please specify your community name.');
        return;
      }
      if (!selectedBureauId) {
        Alert.alert('Bureau Required', 'Please choose a marriage bureau.');
        return;
      }
      setStep(4);
      return;
    }
  };

  const handlePrevStep = () => {
    // At the very first step, go back to home/welcome
    if (step === 1) {
      onShowWelcome();
      return;
    }
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
    if (!emailVerified) {
      Alert.alert('Email Verification Required', 'Please verify your email address first.');
      setStep(1);
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Password Required', 'Please set a valid password of at least 6 characters.');
      setStep(2);
      return;
    }
    if (!selectedCommunityId || !selectedBureauId) {
      Alert.alert('Community & Bureau Required', 'Please select a community and bureau.');
      setStep(3);
      return;
    }
    if (!fullName.trim() || !dob || !gender) {
      Alert.alert('Details Required', 'Please fill in candidate full name, date of birth, and gender.');
      return;
    }
    if (!photos.length) {
      Alert.alert(
        'Photo Required 📷',
        'Please upload at least 1 photo to create your profile. Remember, uploading more photos greatly increases your chances of finding a connection!'
      );
      return;
    }
    if (!eulaAccepted) {
      Alert.alert('Terms of Use', 'You must agree to the Terms of Use (EULA) before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const profileId = generateUUID();

      // 1. Upload photos first (if any)
      const uploadedPaths: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const photoUri = photos[i];
        
        try {
          const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = function () {
              const reader = new FileReader();
              reader.onloadend = function () {
                try {
                  const result = reader.result as string;
                  const base64Data = result.split(',')[1];
                  const binaryString = atob(base64Data);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let j = 0; j < binaryString.length; j++) {
                    bytes[j] = binaryString.charCodeAt(j);
                  }
                  resolve(bytes.buffer);
                } catch (err) {
                  reject(err);
                }
              };
              reader.onerror = reject;
              reader.readAsDataURL(xhr.response);
            };
            xhr.onerror = reject;
            xhr.responseType = "blob";
            xhr.open("GET", photoUri, true);
            xhr.send(null);
          });

          const fileExt = photoUri.split('.').pop()?.toLowerCase() || 'jpg';
          const filename = `${Math.random().toString(36).substring(7)}.${fileExt}`;
          const storagePath = `${profileId}/${filename}`;

          const { error: uploadError } = await supabase.storage
            .from('profile-images')
            .upload(storagePath, arrayBuffer, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
            });

          if (uploadError) {
            console.error('Failed to upload photo:', uploadError.message);
            Alert.alert('Upload Error', `Failed to upload photo: ${uploadError.message}`);
          } else {
            uploadedPaths.push(storagePath);
          }
        } catch (err: any) {
          console.error('Photo reading error:', err);
          Alert.alert('Photo Error', `Failed to process image: ${err.message || err}`);
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
          p_allow_cross_bureau: allowCrossBureau,
          p_height: height || null,
          p_salary_currency: salaryCurrency || 'INR',
          p_father_name: fatherName || null,
          p_father_occupation: fatherOccupation || null,
          p_mother_name: motherName || null,
          p_mother_occupation: motherOccupation || null,
          p_siblings_count: Number(siblingsCount || 0),
          p_siblings: siblings.filter((s) => s.name.trim() || s.occupation.trim()),
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
          <Text style={styles.stepIndicator}>Step {step} of 4</Text>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 30, 60) }]}>
          {/* Step 1: Email Verification */}
          {step === 1 && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Verify Email Address</Text>
              <Text style={styles.sectionSubtitle}>
                Enter your email address to receive a 6-digit verification code.
              </Text>

              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={[styles.input, emailVerified && { backgroundColor: '#F3F4F6', color: '#6B7280' }]}
                placeholder="name@example.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  setOtpSent(false);
                  setEmailVerified(false);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!emailVerified}
              />
              <Text style={styles.inputNoteText}>We will send your login credentials to this email address.</Text>

              {!emailVerified ? (
                <>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { marginTop: 12, opacity: sendingOtp ? 0.7 : 1 }]}
                    onPress={handleSendOtp}
                    disabled={sendingOtp || (otpSent && resendTimer > 0)}
                  >
                    {sendingOtp ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        {otpSent
                          ? resendTimer > 0
                            ? `Resend Code in ${resendTimer}s`
                            : 'Resend Verification Code'
                          : 'Send Verification Code'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {otpSent && (
                    <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#EFEAE2' }}>
                      <Text style={styles.label}>6-Digit Verification Code *</Text>
                      <TextInput
                        style={[styles.input, { letterSpacing: 4, fontSize: 18, fontWeight: '700', textAlign: 'center' }]}
                        placeholder="123456"
                        placeholderTextColor="#999"
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                        maxLength={6}
                      />

                      <TouchableOpacity
                        style={[styles.primaryBtn, { marginTop: 12, backgroundColor: '#10B981' }]}
                        onPress={handleVerifyOtp}
                        disabled={verifyingOtp}
                      >
                        {verifyingOtp ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.primaryBtnText}>Verify Email & Continue</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : (
                <View style={{ marginTop: 16, backgroundColor: '#D1FAE5', padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, marginRight: 8 }}>✅</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#065F46' }}>Email Verified Successfully!</Text>
                </View>
              )}

              <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#EFEAE2', alignItems: 'center' }}>
                <TouchableOpacity onPress={onShowLogin}>
                  <Text style={{ fontSize: 14, color: '#8B1E3F', fontWeight: '600' }}>
                    Already registered? Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 2: Set Password */}
          {step === 2 && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Set Account Password</Text>
              <Text style={styles.sectionSubtitle}>
                Create a secure password of at least 6 characters for signing in.
              </Text>

              <View style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>Verified Email</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>{email}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#10B981' }}>✓ Verified</Text>
              </View>

              <Text style={styles.label}>Password (Min 6 characters) *</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter password"
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

              <Text style={styles.label}>Confirm Password *</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Re-enter password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                  <Text style={styles.eyeText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
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

          {/* Step 3: Caste / Community & Bureau Selection */}
          {step === 3 && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Select Community & Bureau</Text>
              <Text style={styles.sectionSubtitle}>
                Choose your caste/community and the marriage bureau serving your community.
              </Text>

              <Text style={[styles.label, { fontSize: 15, fontWeight: '700', color: '#8B1E3F', marginTop: 8 }]}>
                1. Select Caste / Community *
              </Text>
              {loadingComms ? (
                <ActivityIndicator size="large" color="#8B1E3F" style={{ alignSelf: 'center', marginVertical: 20 }} />
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

              {selectedCommunityName?.toLowerCase().includes('other') && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.label}>Please specify your community *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your community name"
                    placeholderTextColor="#999"
                    value={communityOther}
                    onChangeText={setCommunityOther}
                  />
                </View>
              )}

              <View style={styles.requestCommContainer}>
                <TouchableOpacity
                  style={styles.requestCommBtn}
                  onPress={() => setShowRequestCommModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.requestCommBtnText}>
                    ❓ Not what you’re looking for? Request admin to add your community
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedCommunityId && (
                <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#EFEAE2' }}>
                  <Text style={[styles.label, { fontSize: 15, fontWeight: '700', color: '#8B1E3F' }]}>
                    2. Choose Marriage Bureau *
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
                    Bureaus serving {selectedCommunityName}:
                  </Text>

                  {loadingBureaus ? (
                    <ActivityIndicator size="large" color="#8B1E3F" style={{ alignSelf: 'center', marginVertical: 20 }} />
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

                  <TouchableOpacity
                    style={[styles.checkboxContainer, { marginTop: 16, marginBottom: 8 }]}
                    onPress={() => setAllowCrossBureau(!allowCrossBureau)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, allowCrossBureau && styles.checkboxChecked]}>
                      {allowCrossBureau && <Text style={styles.checkboxCheckmark}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>
                        Include my profile in partner bureau matches within my community (Recommended)
                      </Text>
                      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                        Allows verified candidates from trusted partner bureaus in your community to view your profile and connect.
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handlePrevStep}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
                  onPress={handleNextStep}
                  disabled={!selectedCommunityId || !selectedBureauId}
                >
                  <Text style={styles.primaryBtnText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 4: Profile Details & Photos */}
          {step === 4 && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Candidate Details & Photos</Text>
              <Text style={styles.sectionSubtitle}>
                Provide candidate information, family background, and upload profile photos.
              </Text>

              {/* Candidate Info */}
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
                  maximumDate={new Date(new Date().getFullYear() - 18, 0, 1)}
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

              <Text style={[styles.label, { marginTop: 14 }]}>Contact Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 XXXXX XXXXX"
                placeholderTextColor="#999"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Height (Optional)</Text>
              <TouchableOpacity
                style={styles.pickerToggle}
                onPress={() => setShowHeightModal(true)}
              >
                <Text style={[styles.pickerToggleText, !height && { color: '#999' }]}>
                  {height ? height : 'Select Height'}
                </Text>
              </TouchableOpacity>

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

              <Text style={styles.label}>Annual Salary & Currency (Optional)</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <TouchableOpacity
                  style={[styles.pickerToggle, { width: 100, marginBottom: 0 }]}
                  onPress={() => setShowCurrencyModal(true)}
                >
                  <Text style={styles.pickerToggleText}>{salaryCurrency}</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="e.g. 1500000"
                  placeholderTextColor="#999"
                  value={salary}
                  onChangeText={setSalary}
                  keyboardType="numeric"
                />
              </View>

              {/* Family Details Sub-section */}
              <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#EFEAE2' }}>
                <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 12 }]}>Family Details</Text>
                
                <Text style={styles.label}>Father's Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Father's full name"
                  placeholderTextColor="#999"
                  value={fatherName}
                  onChangeText={setFatherName}
                />

                <Text style={styles.label}>Father's Occupation</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Business / Service / Retired"
                  placeholderTextColor="#999"
                  value={fatherOccupation}
                  onChangeText={setFatherOccupation}
                />

                <Text style={styles.label}>Mother's Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Mother's full name"
                  placeholderTextColor="#999"
                  value={motherName}
                  onChangeText={setMotherName}
                />

                <Text style={styles.label}>Mother's Occupation</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Homemaker / Teacher / Business"
                  placeholderTextColor="#999"
                  value={motherOccupation}
                  onChangeText={setMotherOccupation}
                />

                <Text style={styles.label}>Number of Siblings</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {['0', '1', '2', '3', '4', '5'].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.commChip,
                        siblingsCount === num && styles.commChipActive,
                        { paddingHorizontal: 14, paddingVertical: 8 },
                      ]}
                      onPress={() => handleSiblingsCountChange(num)}
                    >
                      <Text style={[styles.commChipText, siblingsCount === num && styles.commChipTextActive]}>
                        {num === '0' ? 'None' : num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {siblings.map((sib, idx) => (
                  <View key={idx} style={{ backgroundColor: '#FCFAF6', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EFEAE2', marginBottom: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#8B1E3F', marginBottom: 8, textTransform: 'uppercase' }}>
                      Sibling {idx + 1}
                    </Text>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Sibling name"
                      placeholderTextColor="#999"
                      value={sib.name}
                      onChangeText={(val) => {
                        setSiblings((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], name: val };
                          return next;
                        });
                      }}
                    />
                    <Text style={styles.label}>Occupation</Text>
                    <TextInput
                      style={[styles.input, { marginBottom: 0 }]}
                      placeholder="Sibling occupation"
                      placeholderTextColor="#999"
                      value={sib.occupation}
                      onChangeText={(val) => {
                        setSiblings((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], occupation: val };
                          return next;
                        });
                      }}
                    />
                  </View>
                ))}
              </View>

              {/* Partner Preferences */}
              <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#EFEAE2' }}>
                <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 8 }]}>Partner Preferences</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe who you are looking for (age, education, expectations)..."
                  placeholderTextColor="#999"
                  value={partnerPreferences}
                  onChangeText={setPartnerPreferences}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Profile Photos */}
              <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#EFEAE2' }}>
                <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 4 }]}>Profile Photos *</Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
                  Upload at least 1 photo (Max 5 photos). First image will be set as cover.
                </Text>

                <View style={{ backgroundColor: '#FFF7ED', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FFEDD5', marginBottom: 14, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, marginRight: 8 }}>💡</Text>
                  <Text style={{ flex: 1, fontSize: 12, color: '#9A3412', fontWeight: '500' }}>
                    Profiles with photos receive up to 5x more response & connection requests!
                  </Text>
                </View>

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
              </View>

              <TouchableOpacity
                style={[styles.checkboxContainer, { marginTop: 16 }]}
                onPress={() => setEulaAccepted(!eulaAccepted)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, eulaAccepted && styles.checkboxChecked]}>
                  {eulaAccepted && <Text style={styles.checkboxCheckmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  I agree to the{' '}
                  <Text
                    style={{ textDecorationLine: 'underline', color: '#8B1E3F', fontWeight: 'bold' }}
                    onPress={() => router.push('/terms' as any)}
                  >
                    Terms of Use (EULA)
                  </Text>{' '}
                  &{' '}
                  <Text
                    style={{ textDecorationLine: 'underline', color: '#8B1E3F', fontWeight: 'bold' }}
                    onPress={() => router.push('/privacy' as any)}
                  >
                    Privacy Policy
                  </Text>
                  , and understand that ManaPelli has a zero-tolerance policy for objectionable content or abusive behavior.
                </Text>
              </TouchableOpacity>

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

      {/* Height Selector Modal */}
      <Modal visible={showHeightModal} animationType="slide" transparent onRequestClose={() => setShowHeightModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#2C1B1F' }}>Select Height</Text>
              <TouchableOpacity onPress={() => setShowHeightModal(false)}>
                <Text style={{ fontSize: 18, color: '#999', padding: 4 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EFEAE2' }}
                onPress={() => { setHeight(''); setShowHeightModal(false); }}
              >
                <Text style={{ fontSize: 15, color: '#999' }}>None / Not Specified</Text>
              </TouchableOpacity>
              {HEIGHT_OPTIONS.map((h) => (
                <TouchableOpacity
                  key={h.value}
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EFEAE2', flexDirection: 'row', justifyContent: 'space-between' }}
                  onPress={() => { setHeight(h.value); setShowHeightModal(false); }}
                >
                  <Text style={{ fontSize: 15, color: '#2C1B1F', fontWeight: height === h.value ? '700' : '400' }}>{h.label}</Text>
                  {height === h.value && <Text style={{ color: '#8B1E3F', fontWeight: 'bold' }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Currency Selector Modal */}
      <Modal visible={showCurrencyModal} animationType="slide" transparent onRequestClose={() => setShowCurrencyModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#2C1B1F' }}>Select Salary Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Text style={{ fontSize: 18, color: '#999', padding: 4 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {POPULAR_CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EFEAE2', flexDirection: 'row', justifyContent: 'space-between' }}
                  onPress={() => { setSalaryCurrency(c.code); setShowCurrencyModal(false); }}
                >
                  <Text style={{ fontSize: 15, color: '#2C1B1F', fontWeight: salaryCurrency === c.code ? '700' : '400' }}>{c.label}</Text>
                  {salaryCurrency === c.code && <Text style={{ color: '#8B1E3F', fontWeight: 'bold' }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Request Community Modal */}
      <Modal visible={showRequestCommModal} animationType="slide" transparent onRequestClose={() => setShowRequestCommModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#2C1B1F' }}>Request a New Community</Text>
              <TouchableOpacity onPress={() => setShowRequestCommModal(false)}>
                <Text style={{ fontSize: 18, color: '#999', padding: 4 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
                Can't find your community in our list? Request our admin team to add it and make it available for registration and matching.
              </Text>

              <Text style={styles.label}>Community Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Gowda / Naidu / Lingayat"
                placeholderTextColor="#999"
                value={reqCommName}
                onChangeText={setReqCommName}
              />

              <Text style={styles.label}>Your Mobile Phone or Email (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9876543210 or name@gmail.com"
                placeholderTextColor="#999"
                value={reqContact}
                onChangeText={setReqContact}
              />

              <Text style={styles.label}>Additional Notes / Region (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 75, paddingTop: 10, textAlignVertical: 'top' }]}
                placeholder="e.g. Popular in Telangana / Andhra Pradesh"
                placeholderTextColor="#999"
                value={reqNotes}
                onChangeText={setReqNotes}
                multiline
                numberOfLines={3}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 20 }}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setShowRequestCommModal(false)}
                >
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
                  disabled={submittingReq}
                  onPress={handleSubmitCommunityRequest}
                >
                  {submittingReq ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Submit Request</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
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
  inputNoteText: {
    fontSize: 11,
    color: '#998E90',
    marginTop: 4,
    marginBottom: 8,
    fontWeight: '500',
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
  pickerToggle: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FCFAF6',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pickerToggleText: {
    fontSize: 15,
    color: '#2C1B1F',
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    marginTop: 10,
    paddingHorizontal: 4,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#8B1E3F',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#8B1E3F',
  },
  checkboxCheckmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: '#706064',
    lineHeight: 18,
  },
  requestCommContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
    alignItems: 'center',
  },
  requestCommBtn: {
    backgroundColor: '#FFF0F3',
    borderWidth: 1,
    borderColor: '#F8C8D2',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestCommBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B1E3F',
    textAlign: 'center',
  },
});
