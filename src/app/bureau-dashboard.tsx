import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Profile {
  id: string;
  full_name: string;
  dob: string;
  gender: string;
  email: string | null;
  phone: string | null;
  occupation: string | null;
  salary: number | null;
  salary_currency: string;
  current_place: string | null;
  native_place: string | null;
  community: string | null;
  partner_preferences: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  last_password: string | null;
  cover_image_path: string | null;
}

interface ProfileImage {
  storage_path: string;
  is_cover: boolean;
  sort_order: number;
  signedUrl?: string;
}

interface Community {
  id: string;
  name: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const color = status === 'approved' ? '#2E7D32' : status === 'rejected' ? '#B23B3B' : '#A07020';
  const bg = status === 'approved' ? '#E8F5E9' : status === 'rejected' ? '#FDECEA' : '#FFF8E1';
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{status}</Text>
    </View>
  );
};

export default function BureauDashboard() {
  const { role, signOut } = useAuth();
  const bureauId = role?.bureau_id;
  const [bureauName, setBureauName] = useState('My Bureau');
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'add_member'>('pending');

  // Profile Detail Modal
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profileImages, setProfileImages] = useState<ProfileImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const touchStartX = useRef(0);
  const handleTouchStart = (e: any) => {
    touchStartX.current = e.nativeEvent.locationX;
  };
  const handleTouchEnd = (e: any) => {
    const touchEndX = e.nativeEvent.locationX;
    const diff = touchStartX.current - touchEndX;
    if (diff > 50) {
      if (currentImageIndex < profileImages.length - 1) {
        setCurrentImageIndex(currentImageIndex + 1);
      }
    } else if (diff < -50) {
      if (currentImageIndex > 0) {
        setCurrentImageIndex(currentImageIndex - 1);
      }
    }
  };

  // Approve/Reject modal states
  const [isApproveVisible, setIsApproveVisible] = useState(false);
  const [isRejectVisible, setIsRejectVisible] = useState(false);
  const [memberPassword, setMemberPassword] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showMemberPassword, setShowMemberPassword] = useState(false);
  const [showNewMemPassword, setShowNewMemPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editCommunity, setEditCommunity] = useState('');
  const [editOccupation, setEditOccupation] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editSalaryCurrency, setEditSalaryCurrency] = useState('');
  const [editCurrentPlace, setEditCurrentPlace] = useState('');
  const [editNativePlace, setEditNativePlace] = useState('');
  const [editPartnerPref, setEditPartnerPref] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Walk-in Member Creation
  const [bureauCommunities, setBureauCommunities] = useState<Community[]>([]);
  const [loadingComms, setLoadingComms] = useState(false);
  const [newMemName, setNewMemName] = useState('');
  const [newMemDob, setNewMemDob] = useState('');
  const [newMemGender, setNewMemGender] = useState<'male' | 'female'>('male');
  const [newMemCommunityId, setNewMemCommunityId] = useState('');
  const [newMemCommunityName, setNewMemCommunityName] = useState('');
  const [newMemOcc, setNewMemOcc] = useState('');
  const [newMemSalary, setNewMemSalary] = useState('');
  const [newMemPhone, setNewMemPhone] = useState('');
  const [newMemEmail, setNewMemEmail] = useState('');
  const [newMemPassword, setNewMemPassword] = useState('');
  const [newMemStatus, setNewMemStatus] = useState<'pending' | 'approved'>('approved');
  const [newMemCurrent, setNewMemCurrent] = useState('');
  const [newMemNative, setNewMemNative] = useState('');
  const [newMemPref, setNewMemPref] = useState('');
  const [creatingMember, setCreatingMember] = useState(false);

  // Bureau Edit Settings
  const [isEditingBureau, setIsEditingBureau] = useState(false);
  const [bureauLocation, setBureauLocation] = useState('');
  const [bureauAbout, setBureauAbout] = useState('');
  const [bureauPhone, setBureauPhone] = useState('');
  const [updatingBureau, setUpdatingBureau] = useState(false);

  const fetchBureauData = async () => {
    if (!bureauId) return;
    setLoading(true);
    try {
      const { data: bureauData } = await supabase
        .from('bureaus')
        .select('*')
        .eq('id', bureauId)
        .single();
      if (bureauData) {
        setBureauName(bureauData.name);
        setBureauLocation(bureauData.location || '');
        setBureauAbout(bureauData.about_us || '');
        setBureauPhone(bureauData.contact_phone || '');
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('bureau_id', bureauId)
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error(profilesError.message);
      } else if (profilesData) {
        setProfiles(profilesData as Profile[]);
      }

      setLoadingComms(true);
      const { data: commsData } = await supabase
        .from('bureau_communities')
        .select('community_id, communities (id, name)')
        .eq('bureau_id', bureauId);

      if (commsData) {
        const comms = commsData
          .map((item: any) => item.communities)
          .filter((c) => !!c) as Community[];
        setBureauCommunities(comms);
        if (comms.length > 0) {
          setNewMemCommunityId(comms[0].id);
          setNewMemCommunityName(comms[0].name);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingComms(false);
    }
  };

  useEffect(() => {
    fetchBureauData();
  }, [bureauId]);

  const loadProfileImages = async (profileId: string) => {
    setLoadingImages(true);
    setProfileImages([]);
    setCurrentImageIndex(0);
    try {
      const { data, error } = await supabase.rpc('get_profile_image_urls', {
        p_profile_id: profileId,
      });

      if (error) {
        console.error('Error fetching profile images:', error.message);
        return;
      }

      if (!data || data.length === 0) return;

      const paths = data.map((img: ProfileImage) => img.storage_path);
      const { data: signedData } = await supabase.storage
        .from('profile-images')
        .createSignedUrls(paths, 3600);

      const urlMap = new Map<string, string>();
      if (signedData) {
        signedData.forEach((item: any) => {
          if (item.signedUrl && item.path) urlMap.set(item.path, item.signedUrl);
        });
      }

      const images: ProfileImage[] = data.map((img: ProfileImage) => ({
        ...img,
        signedUrl: urlMap.get(img.storage_path) || undefined,
      }));

      setProfileImages(images);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleSelectProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsEditingProfile(false);
    setEditFullName(profile.full_name || '');
    setEditDob(profile.dob || '');
    setEditGender(profile.gender || 'male');
    setEditCommunity(profile.community || '');
    setEditOccupation(profile.occupation || '');
    setEditSalary(profile.salary ? String(profile.salary) : '');
    setEditSalaryCurrency(profile.salary_currency || 'INR');
    setEditCurrentPlace(profile.current_place || '');
    setEditNativePlace(profile.native_place || '');
    setEditPartnerPref(profile.partner_preferences || '');
    setEditPhone(profile.phone || '');
    setEditEmail(profile.email || '');
    setEditPassword(profile.last_password || '');
    loadProfileImages(profile.id);
  };

  const handleCreateMember = async () => {
    if (!newMemName || !newMemDob || !newMemEmail || !newMemPassword) {
      Alert.alert('Error', 'Full Name, Date of Birth, Email, and Password are required');
      return;
    }
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dobRegex.test(newMemDob)) {
      Alert.alert('Invalid Date Format', 'Date of Birth must be YYYY-MM-DD');
      return;
    }

    setCreatingMember(true);
    try {
      const { error } = await supabase.from('profiles').insert({
        bureau_id: bureauId,
        community_id: newMemCommunityId || null,
        full_name: newMemName,
        dob: newMemDob,
        gender: newMemGender,
        email: newMemEmail,
        phone: newMemPhone || null,
        last_password: newMemPassword,
        community: newMemCommunityName,
        current_place: newMemCurrent || 'Not specified',
        native_place: newMemNative || null,
        occupation: newMemOcc || null,
        salary: newMemSalary ? Number(newMemSalary) : null,
        partner_preferences: newMemPref || null,
        status: newMemStatus,
      });

      if (error) {
        Alert.alert('Failed to Add Member', error.message);
      } else {
        Alert.alert('Success', 'Member profile added successfully');
        setNewMemName('');
        setNewMemDob('');
        setNewMemEmail('');
        setNewMemPhone('');
        setNewMemPassword('');
        setNewMemOcc('');
        setNewMemSalary('');
        setNewMemCurrent('');
        setNewMemNative('');
        setNewMemPref('');
        setActiveTab('approved');
        await fetchBureauData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingMember(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedProfile) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFullName,
          dob: editDob,
          gender: editGender,
          community: editCommunity,
          occupation: editOccupation || null,
          salary: editSalary ? Number(editSalary) : null,
          salary_currency: editSalaryCurrency,
          current_place: editCurrentPlace || null,
          native_place: editNativePlace || null,
          partner_preferences: editPartnerPref || null,
          phone: editPhone || null,
          email: editEmail || null,
          last_password: editPassword || null,
        })
        .eq('id', selectedProfile.id);

      if (error) {
        Alert.alert('Update Failed', error.message);
      } else {
        Alert.alert('Success', 'Profile updated successfully');
        setIsEditingProfile(false);
        setSelectedProfile(null);
        await fetchBureauData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;
    Alert.alert('Delete Profile', 'Are you sure you want to permanently delete this profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            const { error } = await supabase
              .from('profiles')
              .delete()
              .eq('id', selectedProfile.id);

            if (error) {
              Alert.alert('Deletion Failed', error.message);
            } else {
              Alert.alert('Success', 'Profile deleted successfully');
              setSelectedProfile(null);
              await fetchBureauData();
            }
          } catch (err) {
            console.error(err);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleApprove = async () => {
    if (!selectedProfile) return;

    if (!selectedProfile.email || !selectedProfile.email.trim()) {
      Alert.alert(
        'Missing Email',
        'This profile does not have a contact email. Please edit the profile details to add an email before approving.'
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(selectedProfile.email.trim())) {
      Alert.alert('Invalid Email Format', 'The email is not valid. Please correct it before approving.');
      return;
    }

    if (!memberPassword || memberPassword.trim().length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'approved' as const,
          last_password: memberPassword.trim(),
        })
        .eq('id', selectedProfile.id)
        .eq('bureau_id', bureauId);

      if (error) {
        Alert.alert('Approval Failed', error.message);
      } else {
        Alert.alert('Approved ✓', `Member approved. Issued password: ${memberPassword.trim()}`);
        setIsApproveVisible(false);
        setSelectedProfile(null);
        setMemberPassword('');
        await fetchBureauData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProfile) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'rejected' as const,
          rejection_reason: rejectionReason || null,
        })
        .eq('id', selectedProfile.id)
        .eq('bureau_id', bureauId);

      if (error) {
        Alert.alert('Rejection Failed', error.message);
      } else {
        Alert.alert('Rejected', 'Matrimony profile has been rejected.');
        setIsRejectVisible(false);
        setSelectedProfile(null);
        setRejectionReason('');
        await fetchBureauData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBureauSettings = async () => {
    if (!bureauId) return;
    setUpdatingBureau(true);
    try {
      const { error } = await supabase
        .from('bureaus')
        .update({
          location: bureauLocation || null,
          about_us: bureauAbout || null,
          contact_phone: bureauPhone || null,
        })
        .eq('id', bureauId);

      if (error) {
        Alert.alert('Update Failed', error.message);
      } else {
        Alert.alert('Success', 'Bureau profile updated successfully');
        setIsEditingBureau(false);
        await fetchBureauData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingBureau(false);
    }
  };

  const filteredProfiles = profiles.filter((p) => p.status === (activeTab === 'add_member' ? 'pending' : activeTab));

  if (loading && profiles.length === 0) {
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
        <View>
          <Text style={styles.logoText}>ManaPelli</Text>
          <Text style={styles.bureauNameSub}>{bureauName} Admin</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer} contentContainerStyle={styles.tabScrollContent}>
        {([
          { key: 'pending', label: `Pending (${profiles.filter((p) => p.status === 'pending').length})` },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'add_member', label: '+ Add Member' },
          { key: 'settings', label: '⚙ Settings' },
        ] as const).map(({ key, label }) => {
          const isActive = key === 'settings' ? isEditingBureau : (activeTab === key && !isEditingBureau);
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => {
                if (key === 'settings') {
                  setIsEditingBureau(true);
                } else {
                  setActiveTab(key as any);
                  setIsEditingBureau(false);
                }
              }}
            >
              <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isEditingBureau ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.editCard}>
            <Text style={styles.cardTitle}>Edit Bureau Profile</Text>

            <Text style={styles.label}>Location</Text>
            <TextInput style={styles.input} value={bureauLocation} onChangeText={setBureauLocation} placeholder="e.g. Hyderabad, TS" placeholderTextColor="#999" />

            <Text style={styles.label}>Contact Phone</Text>
            <TextInput style={styles.input} value={bureauPhone} onChangeText={setBureauPhone} placeholder="Contact phone" placeholderTextColor="#999" keyboardType="phone-pad" />

            <Text style={styles.label}>About Us</Text>
            <TextInput style={[styles.input, styles.textArea]} value={bureauAbout} onChangeText={setBureauAbout} placeholder="About our marriage bureau..." placeholderTextColor="#999" multiline numberOfLines={5} />

            <TouchableOpacity style={styles.saveBureauBtn} onPress={handleSaveBureauSettings} disabled={updatingBureau}>
              {updatingBureau ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBureauBtnText}>Save Bureau Profile</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : activeTab === 'add_member' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.editCard}>
            <Text style={styles.cardTitle}>Create New Member Profile</Text>

            <Text style={styles.label}>Full Name *</Text>
            <TextInput style={styles.input} value={newMemName} onChangeText={setNewMemName} placeholder="Enter full name" placeholderTextColor="#999" />

            <Text style={styles.label}>Date of Birth * (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={newMemDob} onChangeText={setNewMemDob} placeholder="e.g. 1996-05-15" placeholderTextColor="#999" keyboardType="numeric" />

            <Text style={styles.label}>Gender *</Text>
            <View style={styles.genderContainer}>
              {(['male', 'female'] as const).map((g) => (
                <TouchableOpacity key={g} style={[styles.genderBtn, newMemGender === g && styles.genderBtnActive]} onPress={() => setNewMemGender(g)}>
                  <Text style={[styles.genderBtnText, newMemGender === g && styles.genderBtnTextActive]}>{g === 'male' ? 'Groom' : 'Bride'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Caste / Community *</Text>
            {loadingComms ? (
              <ActivityIndicator size="small" color="#8B1E3F" style={{ marginVertical: 10 }} />
            ) : bureauCommunities.length === 0 ? (
              <Text style={styles.errorText}>No communities assigned. Update Settings.</Text>
            ) : (
              <View style={styles.commGrid}>
                {bureauCommunities.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.commChip, newMemCommunityId === c.id && styles.commChipActive]}
                    onPress={() => { setNewMemCommunityId(c.id); setNewMemCommunityName(c.name); }}
                  >
                    <Text style={[styles.commChipText, newMemCommunityId === c.id && styles.commChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.label, { marginTop: 16 }]}>Current Location *</Text>
            <TextInput style={styles.input} value={newMemCurrent} onChangeText={setNewMemCurrent} placeholder="e.g. Hyderabad" placeholderTextColor="#999" />

            <Text style={styles.label}>Native Location</Text>
            <TextInput style={styles.input} value={newMemNative} onChangeText={setNewMemNative} placeholder="Hometown" placeholderTextColor="#999" />

            <Text style={styles.label}>Occupation</Text>
            <TextInput style={styles.input} value={newMemOcc} onChangeText={setNewMemOcc} placeholder="e.g. Doctor" placeholderTextColor="#999" />

            <Text style={styles.label}>Salary</Text>
            <TextInput style={styles.input} value={newMemSalary} onChangeText={setNewMemSalary} placeholder="Income per year" placeholderTextColor="#999" keyboardType="numeric" />

            <Text style={styles.label}>Member Contact Phone</Text>
            <TextInput style={styles.input} value={newMemPhone} onChangeText={setNewMemPhone} placeholder="Phone number" placeholderTextColor="#999" keyboardType="phone-pad" />

            <Text style={styles.label}>Member Email Address *</Text>
            <TextInput style={styles.input} value={newMemEmail} onChangeText={setNewMemEmail} placeholder="Email" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" />

            <Text style={styles.label}>Issue Sign-in Password *</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={newMemPassword}
                onChangeText={setNewMemPassword}
                placeholder="Enter plain password"
                placeholderTextColor="#999"
                secureTextEntry={!showNewMemPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNewMemPassword(!showNewMemPassword)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showNewMemPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Initial Profile Status</Text>
            <View style={styles.genderContainer}>
              {(['approved', 'pending'] as const).map((s) => (
                <TouchableOpacity key={s} style={[styles.genderBtn, newMemStatus === s && styles.genderBtnActive]} onPress={() => setNewMemStatus(s)}>
                  <Text style={[styles.genderBtnText, newMemStatus === s && styles.genderBtnTextActive]}>{s.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Partner Preferences</Text>
            <TextInput style={[styles.input, styles.textArea]} value={newMemPref} onChangeText={setNewMemPref} placeholder="Preferred criteria..." placeholderTextColor="#999" multiline />

            <TouchableOpacity style={styles.saveBureauBtn} onPress={handleCreateMember} disabled={creatingMember}>
              {creatingMember ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBureauBtnText}>Add and Register Member</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredProfiles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchBureauData} colors={['#8B1E3F']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No profiles found in this category.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.profileItem} onPress={() => handleSelectProfile(item)} activeOpacity={0.8}>
              <View style={styles.profileRow}>
                <View style={styles.profileAvatarCircle}>
                  <Text style={styles.profileAvatarText}>{item.full_name?.charAt(0) || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileNameText}>
                    {item.full_name} <Text style={styles.genderBadge}>({item.gender === 'male' ? 'Groom' : 'Bride'})</Text>
                  </Text>
                  <Text style={styles.profileSubText}>
                    🌿 {item.community || 'Community'} · 📍 {item.current_place || 'Location'}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <Modal animationType="slide" transparent={true} visible={!!selectedProfile} onRequestClose={() => setSelectedProfile(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditingProfile ? 'Edit Member details' : 'Member Details'}</Text>
                <TouchableOpacity onPress={() => setSelectedProfile(null)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {isEditingProfile ? (
                  <View style={styles.editForm}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput style={styles.input} value={editFullName} onChangeText={setEditFullName} />
                    <Text style={styles.label}>Date of Birth * (YYYY-MM-DD)</Text>
                    <TextInput style={styles.input} value={editDob} onChangeText={setEditDob} />
                    <Text style={styles.label}>Gender * (male / female)</Text>
                    <TextInput style={styles.input} value={editGender} onChangeText={setEditGender} />
                    <Text style={styles.label}>Community / Caste</Text>
                    <TextInput style={styles.input} value={editCommunity} onChangeText={setEditCommunity} />
                    <Text style={styles.label}>Occupation</Text>
                    <TextInput style={styles.input} value={editOccupation} onChangeText={setEditOccupation} />
                    <Text style={styles.label}>Salary</Text>
                    <TextInput style={styles.input} value={editSalary} onChangeText={setEditSalary} keyboardType="numeric" />
                    <Text style={styles.label}>Current Location</Text>
                    <TextInput style={styles.input} value={editCurrentPlace} onChangeText={setEditCurrentPlace} />
                    <Text style={styles.label}>Native Location</Text>
                    <TextInput style={styles.input} value={editNativePlace} onChangeText={setEditNativePlace} />
                    <Text style={styles.label}>Contact Phone</Text>
                    <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
                    <Text style={styles.label}>Contact Email</Text>
                    <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" />
                    <Text style={styles.label}>Password Issued</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={editPassword}
                        onChangeText={setEditPassword}
                        secureTextEntry={!showEditPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => setShowEditPassword(!showEditPassword)} style={styles.eyeBtn}>
                        <Text style={styles.eyeText}>{showEditPassword ? '🙈' : '👁️'}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.label}>Partner Preferences</Text>
                    <TextInput style={[styles.input, styles.textArea]} value={editPartnerPref} onChangeText={setEditPartnerPref} multiline />
                  </View>
                ) : (
                  <View>
                    {/* Profile Photos */}
                    {loadingImages ? (
                      <View style={styles.photosLoadingContainer}>
                        <ActivityIndicator size="large" color="#8B1E3F" />
                        <Text style={styles.photosLoadingText}>Loading photos...</Text>
                      </View>
                    ) : profileImages.length > 0 ? (
                      <View style={{ position: 'relative', width: '100%', marginBottom: 20 }}>
                        <View
                          style={styles.photosContainer}
                          onTouchStart={handleTouchStart}
                          onTouchEnd={handleTouchEnd}
                        >
                          <Image
                            source={{ uri: profileImages[currentImageIndex]?.signedUrl }}
                            style={styles.mainPhoto}
                            contentFit="cover"
                          />
                        </View>

                        {/* Prev / Next Arrow Overlays */}
                        {profileImages.length > 1 && (
                          <>
                            {currentImageIndex > 0 && (
                              <TouchableOpacity
                                style={[styles.arrowOverlay, styles.leftArrow]}
                                onPress={() => setCurrentImageIndex(currentImageIndex - 1)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.arrowText}>‹</Text>
                              </TouchableOpacity>
                            )}
                            {currentImageIndex < profileImages.length - 1 && (
                              <TouchableOpacity
                                style={[styles.arrowOverlay, styles.rightArrow]}
                                onPress={() => setCurrentImageIndex(currentImageIndex + 1)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.arrowText}>›</Text>
                              </TouchableOpacity>
                            )}
                          </>
                        )}

                        {profileImages.length > 1 && (
                          <View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailRow}>
                              {profileImages.map((img, idx) => (
                                <TouchableOpacity key={idx} onPress={() => setCurrentImageIndex(idx)} style={[styles.thumbnailWrapper, currentImageIndex === idx && styles.thumbnailWrapperActive]}>
                                  <Image source={{ uri: img.signedUrl }} style={styles.thumbnail} contentFit="cover" />
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                            <Text style={styles.photoCountText}>{currentImageIndex + 1} / {profileImages.length}</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={styles.noPhotoPlaceholder}>
                        <Text style={styles.noPhotoText}>👤</Text>
                        <Text style={styles.noPhotoSubText}>No photos uploaded</Text>
                      </View>
                    )}

                    {/* Status badge */}
                    <View style={styles.statusRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <StatusBadge status={selectedProfile.status} />
                    </View>

                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Full Name</Text><Text style={styles.detailValue}>{selectedProfile.full_name}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Gender</Text><Text style={styles.detailValue}>{selectedProfile.gender}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Date of Birth</Text><Text style={styles.detailValue}>{selectedProfile.dob}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Caste / Community</Text><Text style={styles.detailValue}>{selectedProfile.community || 'Not specified'}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Location</Text><Text style={styles.detailValue}>{selectedProfile.current_place || 'Not specified'}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Native Place</Text><Text style={styles.detailValue}>{selectedProfile.native_place || 'Not specified'}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Occupation</Text><Text style={styles.detailValue}>{selectedProfile.occupation || 'Not specified'}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Contact Email</Text><Text style={styles.detailValue}>{selectedProfile.email || 'Not specified'}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Contact Phone</Text><Text style={styles.detailValue}>{selectedProfile.phone || 'Not specified'}</Text></View>
                    {selectedProfile.partner_preferences && (
                      <View style={styles.detailRow}><Text style={styles.detailLabel}>Partner Preferences</Text><Text style={styles.detailValue}>{selectedProfile.partner_preferences}</Text></View>
                    )}

                    {selectedProfile.status === 'approved' && selectedProfile.last_password && (
                      <View style={styles.credentialBox}>
                        <Text style={styles.credentialTitle}>🔑 Credentials Issued</Text>
                        <Text style={styles.credentialText}>Password: {selectedProfile.last_password}</Text>
                      </View>
                    )}

                    {selectedProfile.status === 'rejected' && selectedProfile.rejection_reason && (
                      <View style={styles.rejectionBox}>
                        <Text style={styles.rejectionTitle}>❌ Rejection Reason</Text>
                        <Text style={styles.rejectionText}>{selectedProfile.rejection_reason}</Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              {/* Action Buttons */}
              {isEditingProfile ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.cancelEditBtn} onPress={() => setIsEditingProfile(false)}>
                    <Text style={styles.cancelEditBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveProfileBtn} onPress={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveProfileBtnText}>Save Profile</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.actionColumn}>
                  {selectedProfile.status === 'pending' && (
                    <View style={[styles.actionRow, { marginBottom: 12 }]}>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => setIsRejectVisible(true)}>
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => {
                          setMemberPassword(selectedProfile.last_password || '');
                          setIsApproveVisible(true);
                        }}
                      >
                        <Text style={styles.approveBtnText}>✓ Approve</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.deleteProfileBtn} onPress={handleDeleteProfile}>
                      <Text style={styles.deleteProfileBtnText}>Delete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editProfileBtn} onPress={() => setIsEditingProfile(true)}>
                      <Text style={styles.editProfileBtnText}>Edit Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Approve Password Prompt inside Selected Profile Modal */}
              <Modal animationType="fade" transparent={true} visible={isApproveVisible} onRequestClose={() => setIsApproveVisible(false)}>
                <View style={styles.alertOverlay}>
                  <View style={styles.alertCard}>
                    <Text style={styles.alertTitle}>Approve Member Profile</Text>
                    <Text style={styles.alertDesc}>Enter or verify the sign-in password for this member. Communicate it to them directly.</Text>
                    
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Enter sign-in password"
                        placeholderTextColor="#999"
                        secureTextEntry={!showMemberPassword}
                        value={memberPassword}
                        onChangeText={setMemberPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => setShowMemberPassword(!showMemberPassword)} style={styles.eyeBtn}>
                        <Text style={styles.eyeText}>{showMemberPassword ? '🙈' : '👁️'}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.alertBtnRow}>
                      <TouchableOpacity style={styles.alertCancelBtn} onPress={() => { setIsApproveVisible(false); setMemberPassword(''); setShowMemberPassword(false); }}>
                        <Text style={styles.alertCancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.alertConfirmBtn} onPress={handleApprove}>
                        <Text style={styles.alertConfirmBtnText}>Approve ✓</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>

              {/* Reject Reason Prompt inside Selected Profile Modal */}
              <Modal animationType="fade" transparent={true} visible={isRejectVisible} onRequestClose={() => setIsRejectVisible(false)}>
                <View style={styles.alertOverlay}>
                  <View style={styles.alertCard}>
                    <Text style={styles.alertTitle}>Reject This Profile?</Text>
                    <Text style={styles.alertDesc}>Optionally provide a rejection reason:</Text>
                    <TextInput
                      style={[styles.alertInput, { height: 80, textAlignVertical: 'top' }]}
                      placeholder="Reason (optional)"
                      placeholderTextColor="#999"
                      value={rejectionReason}
                      onChangeText={setRejectionReason}
                      multiline
                    />
                    <View style={styles.alertBtnRow}>
                      <TouchableOpacity style={styles.alertCancelBtn} onPress={() => { setIsRejectVisible(false); setRejectionReason(''); }}>
                        <Text style={styles.alertCancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.alertConfirmBtn, { backgroundColor: '#B23B3B' }]} onPress={handleReject}>
                        <Text style={styles.alertConfirmBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  logoText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: '#8B1E3F',
  },
  bureauNameSub: { fontSize: 11, color: '#998E90', marginTop: 2 },
  signOutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    borderRadius: 20,
    backgroundColor: '#FCFAF6',
  },
  signOutBtnText: { fontSize: 13, color: '#706064', fontWeight: '600' },
  tabContainer: {
    maxHeight: 48,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE2',
  },
  tabScrollContent: { paddingHorizontal: 12, alignItems: 'center', gap: 4 },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 2,
  },
  tabButtonActive: { backgroundColor: '#8B1E3F' },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: '#706064' },
  tabButtonTextActive: { color: '#FFFFFF' },
  scrollContent: { padding: 20, flexGrow: 1 },
  listContent: { padding: 16, gap: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: '#998E90' },
  profileItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F4E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 18, fontWeight: '700', color: '#8B1E3F' },
  profileNameText: { fontSize: 15, fontWeight: '700', color: '#2C1B1F' },
  genderBadge: { fontWeight: '400', fontSize: 13, color: '#706064' },
  profileSubText: { fontSize: 12, color: '#998E90', marginTop: 3 },
  viewDetailLink: { fontSize: 13, fontWeight: '600', color: '#8B1E3F' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE2',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 18,
    fontWeight: '700',
    color: '#2C1B1F',
  },
  closeBtn: { fontSize: 20, color: '#706064', padding: 4 },
  modalScroll: { paddingHorizontal: 24, paddingTop: 12 },
  // Photos section
  photosContainer: { marginBottom: 20 },
  arrowOverlay: {
    position: 'absolute',
    top: '35%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  leftArrow: {
    left: 12,
  },
  rightArrow: {
    right: 12,
  },
  arrowText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  photosLoadingContainer: { height: 200, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FAF7F2', borderRadius: 16, marginBottom: 20 },
  photosLoadingText: { fontSize: 13, color: '#998E90' },
  mainPhoto: {
    width: '100%',
    height: 260,
    borderRadius: 16,
    backgroundColor: '#F0EAE5',
  },
  thumbnailRow: { marginTop: 10 },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailWrapperActive: { borderColor: '#8B1E3F' },
  thumbnail: { width: '100%', height: '100%' },
  photoCountText: { fontSize: 11, color: '#998E90', marginTop: 6, textAlign: 'center' },
  noPhotoPlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5EE',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    borderStyle: 'dashed',
  },
  noPhotoText: { fontSize: 48 },
  noPhotoSubText: { fontSize: 13, color: '#998E90', marginTop: 8 },
  // Detail rows
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F0EA' },
  detailRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F0EA' },
  detailLabel: { fontSize: 11, fontWeight: '700', color: '#998E90', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  detailValue: { fontSize: 15, color: '#2C1B1F' },
  credentialBox: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, marginTop: 16 },
  credentialTitle: { fontSize: 13, fontWeight: '700', color: '#2E7D32', marginBottom: 6 },
  credentialText: { fontSize: 14, color: '#2E7D32' },
  rejectionBox: { backgroundColor: '#FDECEA', borderRadius: 12, padding: 14, marginTop: 16 },
  rejectionTitle: { fontSize: 13, fontWeight: '700', color: '#B23B3B', marginBottom: 6 },
  rejectionText: { fontSize: 14, color: '#B23B3B' },
  // Actions
  actionColumn: { paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#EFEAE2' },
  actionRow: { flexDirection: 'row', gap: 12 },
  approveBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  approveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  rejectBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#FDECEA',
    borderWidth: 1,
    borderColor: '#F5C6C6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: { color: '#B23B3B', fontWeight: '700', fontSize: 15 },
  editProfileBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F3F5FE',
    borderWidth: 1,
    borderColor: '#D0D8F7',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileBtnText: { color: '#3B4BBB', fontWeight: '600', fontSize: 14 },
  deleteProfileBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#FDF7F7',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteProfileBtnText: { color: '#B23B3B', fontWeight: '600', fontSize: 14 },
  cancelEditBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelEditBtnText: { color: '#706064', fontWeight: '600', fontSize: 15 },
  saveProfileBtn: {
    flex: 2,
    height: 48,
    backgroundColor: '#8B1E3F',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveProfileBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  editCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  editForm: {},
  cardTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: '#2C1B1F',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: { fontSize: 11, fontWeight: '700', color: '#706064', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#2C1B1F',
    backgroundColor: '#FCFAF6',
    marginBottom: 16,
  },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  saveBureauBtn: {
    height: 50,
    backgroundColor: '#8B1E3F',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBureauBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  genderContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  genderBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCFAF6',
  },
  genderBtnActive: { borderColor: '#8B1E3F', backgroundColor: '#FDF7F8' },
  genderBtnText: { fontSize: 14, color: '#706064', fontWeight: '600' },
  genderBtnTextActive: { color: '#8B1E3F' },
  commGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  commChip: {
    backgroundColor: '#FCFAF6',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  commChipActive: { backgroundColor: '#8B1E3F', borderColor: '#8B1E3F' },
  commChipText: { fontSize: 14, color: '#706064', fontWeight: '500' },
  commChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  errorText: { fontSize: 13, color: '#B23B3B', marginBottom: 12 },
  // Alert Modals
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  alertCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '100%' },
  alertTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 18,
    fontWeight: '700',
    color: '#2C1B1F',
    marginBottom: 8,
  },
  alertDesc: { fontSize: 13, color: '#706064', lineHeight: 18, marginBottom: 16 },
  alertInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#2C1B1F',
    backgroundColor: '#FCFAF6',
    marginBottom: 20,
  },
  alertBtnRow: { flexDirection: 'row', gap: 12 },
  alertCancelBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCancelBtnText: { color: '#706064', fontWeight: '600', fontSize: 15 },
  alertConfirmBtn: {
    flex: 2,
    height: 48,
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertConfirmBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 12,
    backgroundColor: '#FCFAF6',
    paddingRight: 10,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    color: '#2C1B1F',
    fontSize: 14,
  },
  eyeBtn: {
    padding: 8,
  },
  eyeText: {
    fontSize: 18,
  },
});
