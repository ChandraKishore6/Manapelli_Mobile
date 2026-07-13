import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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

interface Bureau {
  id: string;
  name: string;
  contact_email: string | null;
  pending_admin_email: string | null;
  contact_phone: string | null;
  location: string | null;
  about_us: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_password: string | null;
  logo_url: string | null;
}

interface Profile {
  id: string;
  bureau_id: string;
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
}

interface Community {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export default function MasterDashboard() {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bureaus, setBureaus] = useState<Bureau[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeTab, setActiveTab] = useState<'pending_bureaus' | 'all_bureaus' | 'profiles' | 'communities' | 'add_bureau' | 'add_member'>('pending_bureaus');

  // Bureau Edit States
  const [selectedBureau, setSelectedBureau] = useState<Bureau | null>(null);
  const [isEditingBureau, setIsEditingBureau] = useState(false);
  const [editBurName, setEditBurName] = useState('');
  const [editBurEmail, setEditBurEmail] = useState('');
  const [editBurPhone, setEditBurPhone] = useState('');
  const [editBurLoc, setEditBurLoc] = useState('');
  const [editBurAbout, setEditBurAbout] = useState('');
  const [editBurStatus, setEditBurStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [editBurPassword, setEditBurPassword] = useState('');
  const [savingBureau, setSavingBureau] = useState(false);

  // Profile Edit States
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfName, setEditProfName] = useState('');
  const [editProfDob, setEditProfDob] = useState('');
  const [editProfGender, setEditProfGender] = useState('');
  const [editProfComm, setEditProfComm] = useState('');
  const [editProfOcc, setEditProfOcc] = useState('');
  const [editProfSalary, setEditProfSalary] = useState('');
  const [editProfSalaryCurr, setEditProfSalaryCurr] = useState('');
  const [editProfCurrPlace, setEditProfCurrPlace] = useState('');
  const [editProfNatPlace, setEditProfNatPlace] = useState('');
  const [editProfPhone, setEditProfPhone] = useState('');
  const [editProfEmail, setEditProfEmail] = useState('');
  const [editProfPassword, setEditProfPassword] = useState('');
  const [editProfStatus, setEditProfStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [editProfRejection, setEditProfRejection] = useState('');
  const [editProfPartnerPref, setEditProfPartnerPref] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Bureau Approval Prompt (from Pending tab)
  const [isApproveVisible, setIsApproveVisible] = useState(false);
  const [bureauAdminPassword, setBureauAdminPassword] = useState('');

  // Profile Images + Approval
  const [profileImages, setProfileImages] = useState<{ storage_path: string; is_cover: boolean; sort_order: number; signedUrl?: string }[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isApproveProfVisible, setIsApproveProfVisible] = useState(false);
  const [memberPassword, setMemberPassword] = useState('');

  // Password visibility states
  const [showBurPassword, setShowBurPassword] = useState(false);
  const [showNewMemPassword, setShowNewMemPassword] = useState(false);
  const [showEditBurPassword, setShowEditBurPassword] = useState(false);
  const [showEditProfPassword, setShowEditProfPassword] = useState(false);
  const [showApproveBurPassword, setShowApproveBurPassword] = useState(false);
  const [showApproveProfPassword, setShowApproveProfPassword] = useState(false);

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

  // Add Community States
  const [newCommName, setNewCommName] = useState('');
  const [newCommSlug, setNewCommSlug] = useState('');
  const [addingCommunity, setAddingCommunity] = useState(false);

  // Create Bureau States
  const [newBurName, setNewBurName] = useState('');
  const [newBurEmail, setNewBurEmail] = useState('');
  const [newBurPhone, setNewBurPhone] = useState('');
  const [newBurLoc, setNewBurLoc] = useState('');
  const [newBurStatus, setNewBurStatus] = useState<'pending' | 'approved'>('approved');
  const [newBurPassword, setNewBurPassword] = useState('');
  const [newBurAbout, setNewBurAbout] = useState('');
  const [newBurComms, setNewBurComms] = useState<string[]>([]);
  const [creatingBureau, setCreatingBureau] = useState(false);

  // Create Member States
  const [newMemBurId, setNewMemBurId] = useState('');
  const [newMemCommId, setNewMemCommId] = useState('');
  const [newMemCommName, setNewMemCommName] = useState('');
  const [bureauCommunities, setBureauCommunities] = useState<Community[]>([]);
  const [loadingMemComms, setLoadingMemComms] = useState(false);

  const [newMemName, setNewMemName] = useState('');
  const [newMemDob, setNewMemDob] = useState('');
  const [newMemGender, setNewMemGender] = useState<'male' | 'female'>('male');
  const [newMemPhone, setNewMemPhone] = useState('');
  const [newMemEmail, setNewMemEmail] = useState('');
  const [newMemPassword, setNewMemPassword] = useState('');
  const [newMemStatus, setNewMemStatus] = useState<'pending' | 'approved'>('approved');
  const [newMemCurrent, setNewMemCurrent] = useState('');
  const [newMemNative, setNewMemNative] = useState('');
  const [newMemOcc, setNewMemOcc] = useState('');
  const [newMemSalary, setNewMemSalary] = useState('');
  const [newMemPref, setNewMemPref] = useState('');
  const [creatingMember, setCreatingMember] = useState(false);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Bureaus
      const { data: bureausData } = await supabase
        .from('bureaus')
        .select('*')
        .order('created_at', { ascending: false });
      if (bureausData) {
        setBureaus(bureausData as Bureau[]);
        if (bureausData.length > 0) {
          // Initialize direct member creation bureau selection
          const approvedBurs = bureausData.filter((b) => b.status === 'approved');
          if (approvedBurs.length > 0) {
            setNewMemBurId(approvedBurs[0].id);
          }
        }
      }

      // 2. Fetch Profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (profilesData) {
        setProfiles(profilesData as Profile[]);
      }

      // 3. Fetch Communities
      const { data: commsData } = await supabase
        .from('communities')
        .select('*')
        .order('sort_order', { ascending: true });
      if (commsData) {
        setCommunities(commsData as Community[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  // Fetch Bureau-specific communities for Direct Member Add
  useEffect(() => {
    const fetchBureauComms = async () => {
      if (!newMemBurId) {
        setBureauCommunities([]);
        return;
      }
      setLoadingMemComms(true);
      try {
        const { data } = await supabase
          .from('bureau_communities')
          .select('community_id, communities (id, name, slug, is_active)')
          .eq('bureau_id', newMemBurId);
        if (data) {
          const comms = data
            .map((item: any) => item.communities)
            .filter((c) => !!c) as Community[];
          setBureauCommunities(comms);
          if (comms.length > 0) {
            setNewMemCommId(comms[0].id);
            setNewMemCommName(comms[0].name);
          } else {
            setNewMemCommId('');
            setNewMemCommName('');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMemComms(false);
      }
    };
    fetchBureauComms();
  }, [newMemBurId]);

  const handleSelectBureau = (bureau: Bureau) => {
    setSelectedBureau(bureau);
    setIsEditingBureau(false);
    setEditBurName(bureau.name || '');
    setEditBurEmail(bureau.contact_email || '');
    setEditBurPhone(bureau.contact_phone || '');
    setEditBurLoc(bureau.location || '');
    setEditBurAbout(bureau.about_us || '');
    setEditBurStatus(bureau.status || 'pending');
    setEditBurPassword(bureau.admin_password || '');
  };

  const handleSelectProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsEditingProfile(false);
    setEditProfName(profile.full_name || '');
    setEditProfDob(profile.dob || '');
    setEditProfGender(profile.gender || 'male');
    setEditProfComm(profile.community || '');
    setEditProfOcc(profile.occupation || '');
    setEditProfSalary(profile.salary ? String(profile.salary) : '');
    setEditProfSalaryCurr(profile.salary_currency || 'INR');
    setEditProfCurrPlace(profile.current_place || '');
    setEditProfNatPlace(profile.native_place || '');
    setEditProfPhone(profile.phone || '');
    setEditProfEmail(profile.email || '');
    setEditProfPassword(profile.last_password || '');
    setEditProfStatus(profile.status || 'pending');
    setEditProfRejection(profile.rejection_reason || '');
    setEditProfPartnerPref(profile.partner_preferences || '');
    // Load images
    loadProfileImages(profile.id);
  };

  const loadProfileImages = async (profileId: string) => {
    setLoadingImages(true);
    setProfileImages([]);
    setCurrentImageIndex(0);
    try {
      const { data, error } = await supabase.rpc('get_profile_image_urls', { p_profile_id: profileId });
      if (error || !data || data.length === 0) return;

      const paths = data.map((img: any) => img.storage_path);
      const { data: signedData } = await supabase.storage.from('profile-images').createSignedUrls(paths, 3600);
      const urlMap = new Map<string, string>();
      if (signedData) signedData.forEach((item: any) => { if (item.signedUrl && item.path) urlMap.set(item.path, item.signedUrl); });

      setProfileImages(data.map((img: any) => ({ ...img, signedUrl: urlMap.get(img.storage_path) })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleCreateBureau = async () => {
    if (!newBurName || !newBurName.trim()) {
      Alert.alert('Error', 'Bureau Name is required');
      return;
    }
    if (!newBurEmail || !newBurEmail.trim()) {
      Alert.alert('Error', 'Contact Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newBurEmail.trim())) {
      Alert.alert('Invalid Email Format', 'Please enter a valid email address');
      return;
    }
    if (newBurStatus === 'approved') {
      if (!newBurPassword || newBurPassword.trim().length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters long for approved bureaus');
        return;
      }
    }
    if (newBurComms.length === 0) {
      Alert.alert('Error', 'Please select at least one community served by this bureau');
      return;
    }

    setCreatingBureau(true);
    try {
      // 1. Insert bureau
      const { data: bureauData, error: bureauError } = await supabase
        .from('bureaus')
        .insert({
          name: newBurName,
          contact_email: newBurEmail,
          contact_phone: newBurPhone || null,
          location: newBurLoc || null,
          about_us: newBurAbout || null,
          status: newBurStatus,
          admin_password: newBurPassword || null,
        })
        .select('id')
        .single();

      if (bureauError) {
        Alert.alert('Failed to Create Bureau', bureauError.message);
        setCreatingBureau(false);
        return;
      }

      const bureauId = bureauData?.id;

      // 2. Link communities served
      const links = newBurComms.map((cid) => ({
        bureau_id: bureauId,
        community_id: cid,
      }));

      const { error: linksError } = await supabase
        .from('bureau_communities')
        .insert(links);

      if (linksError) {
        console.error('Failed to link communities:', linksError.message);
      }

      Alert.alert('Success', 'Bureau created successfully');
      // Reset Fields
      setNewBurName('');
      setNewBurEmail('');
      setNewBurPhone('');
      setNewBurLoc('');
      setNewBurPassword('');
      setNewBurAbout('');
      setNewBurComms([]);
      setActiveTab('all_bureaus');
      await fetchMasterData();
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingBureau(false);
    }
  };

  const handleCreateMember = async () => {
    if (!newMemBurId || !newMemName || !newMemDob || !newMemEmail || !newMemPassword) {
      Alert.alert('Error', 'Bureau, Full Name, DOB, Email, and Password are required');
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
        bureau_id: newMemBurId,
        community_id: newMemCommId || null,
        full_name: newMemName,
        dob: newMemDob,
        gender: newMemGender,
        email: newMemEmail,
        phone: newMemPhone || null,
        last_password: newMemPassword,
        community: newMemCommName,
        current_place: newMemCurrent || 'Not specified',
        native_place: newMemNative || null,
        occupation: newMemOcc || null,
        salary: newMemSalary ? Number(newMemSalary) : null,
        partner_preferences: newMemPref || null,
        status: newMemStatus,
      });

      if (error) {
        Alert.alert('Failed to Create Profile', error.message);
      } else {
        Alert.alert('Success', 'Member profile created successfully');
        // Reset Fields
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
        setActiveTab('profiles');
        await fetchMasterData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingMember(false);
    }
  };

  const handleSaveBureau = async () => {
    if (!selectedBureau) return;

    if (!editBurName || !editBurName.trim()) {
      Alert.alert('Error', 'Bureau Name is required');
      return;
    }

    if (!editBurEmail || !editBurEmail.trim()) {
      Alert.alert('Error', 'Contact Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editBurEmail.trim())) {
      Alert.alert('Invalid Email Format', 'Please enter a valid email address');
      return;
    }

    setSavingBureau(true);
    try {
      const { error } = await supabase
        .from('bureaus')
        .update({
          name: editBurName,
          contact_email: editBurEmail,
          contact_phone: editBurPhone || null,
          location: editBurLoc || null,
          about_us: editBurAbout || null,
          status: editBurStatus,
          admin_password: editBurPassword || null,
        })
        .eq('id', selectedBureau.id);

      if (error) {
        Alert.alert('Update Failed', error.message);
      } else {
        Alert.alert('Success', 'Bureau updated successfully');
        setIsEditingBureau(false);
        setSelectedBureau(null);
        await fetchMasterData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingBureau(false);
    }
  };

  const handleDeleteBureau = async () => {
    if (!selectedBureau) return;
    Alert.alert('Delete Bureau', 'Are you sure you want to permanently delete this bureau and all associated profiles?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            const { error } = await supabase
              .from('bureaus')
              .delete()
              .eq('id', selectedBureau.id);

            if (error) {
              Alert.alert('Deletion Failed', error.message);
            } else {
              Alert.alert('Success', 'Bureau deleted successfully');
              setSelectedBureau(null);
              await fetchMasterData();
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

  const handleSaveProfile = async () => {
    if (!selectedProfile) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editProfName,
          dob: editProfDob,
          gender: editProfGender,
          community: editProfComm,
          occupation: editProfOcc || null,
          salary: editProfSalary ? Number(editProfSalary) : null,
          salary_currency: editProfSalaryCurr,
          current_place: editProfCurrPlace || null,
          native_place: editProfNatPlace || null,
          phone: editProfPhone || null,
          email: editProfEmail || null,
          last_password: editProfPassword || null,
          status: editProfStatus,
          rejection_reason: editProfRejection || null,
          partner_preferences: editProfPartnerPref || null,
        })
        .eq('id', selectedProfile.id);

      if (error) {
        Alert.alert('Update Failed', error.message);
      } else {
        Alert.alert('Success', 'Profile updated successfully');
        setIsEditingProfile(false);
        setSelectedProfile(null);
        await fetchMasterData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;
    Alert.alert('Delete Profile', 'Are you sure you want to permanently delete this member profile?', [
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
              await fetchMasterData();
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

  const handleApproveBureau = async () => {
    if (!selectedBureau) return;

    // Use either pending_admin_email (website registered) or contact_email (mobile registered)
    const adminEmail = selectedBureau.pending_admin_email || selectedBureau.contact_email;

    if (!adminEmail || !adminEmail.trim()) {
      Alert.alert(
        'Missing Admin Email',
        'This bureau application does not have an admin email. Please edit the bureau details to add an admin email before approving.'
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail.trim())) {
      Alert.alert('Invalid Email Format', 'The admin email is not valid. Please correct it before approving.');
      return;
    }

    if (!bureauAdminPassword || bureauAdminPassword.trim().length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('bureaus')
        .update({
          status: 'approved',
          admin_password: bureauAdminPassword,
        })
        .eq('id', selectedBureau.id);

      if (error) {
        Alert.alert('Approval Failed', error.message);
      } else {
        Alert.alert('Bureau Approved', `Access password issued: ${bureauAdminPassword}`);
        setIsApproveVisible(false);
        setSelectedBureau(null);
        setBureauAdminPassword('');
        await fetchMasterData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProfile = async () => {
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
        .update({ status: 'approved', last_password: memberPassword.trim() })
        .eq('id', selectedProfile.id);

      if (error) {
        Alert.alert('Approval Failed', error.message);
      } else {
        Alert.alert('Member Approved ✓', `Password issued: ${memberPassword.trim()}`);
        setIsApproveProfVisible(false);
        setSelectedProfile(null);
        setMemberPassword('');
        await fetchMasterData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectBureau = async () => {
    if (!selectedBureau) return;

    Alert.alert('Reject Bureau', 'Are you sure you want to reject this bureau application?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            const { error } = await supabase
              .from('bureaus')
              .update({ status: 'rejected' })
              .eq('id', selectedBureau.id);

            if (error) {
              Alert.alert('Rejection Failed', error.message);
            } else {
              Alert.alert('Success', 'Bureau application rejected.');
              setSelectedBureau(null);
              await fetchMasterData();
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

  const handleToggleCommunity = async (comm: Community) => {
    try {
      const { error } = await supabase
        .from('communities')
        .update({ is_active: !comm.is_active })
        .eq('id', comm.id);

      if (error) {
        Alert.alert('Toggle Failed', error.message);
      } else {
        await fetchMasterData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCommunity = async () => {
    if (!newCommName || !newCommSlug) {
      Alert.alert('Error', 'Name and Slug are required');
      return;
    }
    setAddingCommunity(true);
    try {
      const { error } = await supabase
        .from('communities')
        .insert({
          name: newCommName,
          slug: newCommSlug,
          is_active: true,
        });

      if (error) {
        Alert.alert('Failed to Add', error.message);
      } else {
        setNewCommName('');
        setNewCommSlug('');
        await fetchMasterData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingCommunity(false);
    }
  };

  const handleToggleNewBurComm = (cid: string) => {
    setNewBurComms((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logoText}>ManaPelli</Text>
          <Text style={styles.subtitle}>Master Admin Panel</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer} contentContainerStyle={styles.tabScrollContent}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'pending_bureaus' && styles.tabButtonActive]}
          onPress={() => setActiveTab('pending_bureaus')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'pending_bureaus' && styles.tabButtonTextActive]}>
            Pending Bureaus ({bureaus.filter((b) => b.status === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'all_bureaus' && styles.tabButtonActive]}
          onPress={() => setActiveTab('all_bureaus')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'all_bureaus' && styles.tabButtonTextActive]}>
            All Bureaus
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'profiles' && styles.tabButtonActive]}
          onPress={() => setActiveTab('profiles')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'profiles' && styles.tabButtonTextActive]}>
            All Members
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'communities' && styles.tabButtonActive]}
          onPress={() => setActiveTab('communities')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'communities' && styles.tabButtonTextActive]}>
            Communities
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'add_bureau' && styles.tabButtonActive]}
          onPress={() => setActiveTab('add_bureau')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'add_bureau' && styles.tabButtonTextActive]}>
            Add Bureau
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'add_member' && styles.tabButtonActive]}
          onPress={() => setActiveTab('add_member')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'add_member' && styles.tabButtonTextActive]}>
            Add Member
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8B1E3F" />
        </View>
      ) : activeTab === 'add_bureau' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.createCard}>
            <Text style={styles.cardTitle}>Create New Bureau Account</Text>

            <Text style={styles.label}>Bureau Name *</Text>
            <TextInput style={styles.input} value={newBurName} onChangeText={setNewBurName} placeholder="Bureau Name" placeholderTextColor="#999" />

            <Text style={styles.label}>Contact Email Address *</Text>
            <TextInput style={styles.input} value={newBurEmail} onChangeText={setNewBurEmail} placeholder="admin@bureau.com" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" />

            <Text style={styles.label}>Contact Phone Number</Text>
            <TextInput style={styles.input} value={newBurPhone} onChangeText={setNewBurPhone} placeholder="Phone number" placeholderTextColor="#999" keyboardType="phone-pad" />

            <Text style={styles.label}>Location / Region</Text>
            <TextInput style={styles.input} value={newBurLoc} onChangeText={setNewBurLoc} placeholder="e.g. Chennai, TN" placeholderTextColor="#999" />

            <Text style={styles.label}>Initial Approval Status</Text>
            <View style={styles.genderContainer}>
              {(['approved', 'pending'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.genderBtn, newBurStatus === s && styles.genderBtnActive]}
                  onPress={() => setNewBurStatus(s)}
                >
                  <Text style={[styles.genderBtnText, newBurStatus === s && styles.genderBtnTextActive]}>
                    {s.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {newBurStatus === 'approved' && (
              <View>
                <Text style={styles.label}>Admin Account Password *</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={newBurPassword}
                    onChangeText={setNewBurPassword}
                    placeholder="Enter sign-in password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showBurPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowBurPassword(!showBurPassword)} style={styles.eyeBtn}>
                    <Text style={styles.eyeText}>{showBurPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.label}>Communities Served *</Text>
            <Text style={styles.secDesc}>Select community castes this bureau will match.</Text>
            <View style={styles.commGrid}>
              {communities.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.commChip,
                    newBurComms.includes(c.id) && styles.commChipActive,
                  ]}
                  onPress={() => handleToggleNewBurComm(c.id)}
                >
                  <Text
                    style={[
                      styles.commChipText,
                      newBurComms.includes(c.id) && styles.commChipTextActive,
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>About Bureau</Text>
            <TextInput style={[styles.input, styles.textArea]} value={newBurAbout} onChangeText={setNewBurAbout} placeholder="History / Info" placeholderTextColor="#999" multiline />

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateBureau} disabled={creatingBureau}>
              {creatingBureau ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Create Bureau Portal</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : activeTab === 'add_member' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.createCard}>
            <Text style={styles.cardTitle}>Register Member under Bureau</Text>

            <Text style={styles.label}>Target Marriage Bureau *</Text>
            <View style={styles.burGrid}>
              {bureaus.filter(b => b.status === 'approved').map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.burChip,
                    newMemBurId === b.id && styles.burChipActive,
                  ]}
                  onPress={() => setNewMemBurId(b.id)}
                >
                  <Text
                    style={[
                      styles.burChipText,
                      newMemBurId === b.id && styles.burChipTextActive,
                    ]}
                  >
                    {b.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>Member Caste / Community *</Text>
            {loadingMemComms ? (
              <ActivityIndicator size="small" color="#8B1E3F" style={{ marginVertical: 10 }} />
            ) : bureauCommunities.length === 0 ? (
              <Text style={styles.errorText}>No communities assigned to this bureau.</Text>
            ) : (
              <View style={styles.commGrid}>
                {bureauCommunities.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.commChip,
                      newMemCommId === c.id && styles.commChipActive,
                    ]}
                    onPress={() => {
                      setNewMemCommId(c.id);
                      setNewMemCommName(c.name);
                    }}
                  >
                    <Text
                      style={[
                        styles.commChipText,
                        newMemCommId === c.id && styles.commChipTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.label, { marginTop: 20 }]}>Full Name *</Text>
            <TextInput style={styles.input} value={newMemName} onChangeText={setNewMemName} placeholder="Enter full name" placeholderTextColor="#999" />

            <Text style={styles.label}>Date of Birth * (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={newMemDob} onChangeText={setNewMemDob} placeholder="e.g. 1996-05-15" placeholderTextColor="#999" keyboardType="numeric" />

            <Text style={styles.label}>Gender *</Text>
            <View style={styles.genderContainer}>
              {(['male', 'female'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, newMemGender === g && styles.genderBtnActive]}
                  onPress={() => setNewMemGender(g)}
                >
                  <Text style={[styles.genderBtnText, newMemGender === g && styles.genderBtnTextActive]}>
                    {g === 'male' ? 'Groom' : 'Bride'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Current City Location *</Text>
            <TextInput style={styles.input} value={newMemCurrent} onChangeText={setNewMemCurrent} placeholder="e.g. Sydney, Australia" placeholderTextColor="#999" />

            <Text style={styles.label}>Native Location</Text>
            <TextInput style={styles.input} value={newMemNative} onChangeText={setNewMemNative} placeholder="Hometown" placeholderTextColor="#999" />

            <Text style={styles.label}>Occupation</Text>
            <TextInput style={styles.input} value={newMemOcc} onChangeText={setNewMemOcc} placeholder="e.g. Engineer" placeholderTextColor="#999" />

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
                placeholder="Plain password"
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
                <TouchableOpacity
                  key={s}
                  style={[styles.genderBtn, newMemStatus === s && styles.genderBtnActive]}
                  onPress={() => setNewMemStatus(s)}
                >
                  <Text style={[styles.genderBtnText, newMemStatus === s && styles.genderBtnTextActive]}>
                    {s.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Partner Preferences</Text>
            <TextInput style={[styles.input, styles.textArea]} value={newMemPref} onChangeText={setNewMemPref} placeholder="Preferred criteria..." placeholderTextColor="#999" multiline />

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateMember} disabled={creatingMember}>
              {creatingMember ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Add and Register Member</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : activeTab === 'communities' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Add Community Form */}
          <View style={styles.addCommCard}>
            <Text style={styles.cardTitle}>Add Community Caste</Text>
            <Text style={styles.label}>Caste Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Reddy"
              placeholderTextColor="#999"
              value={newCommName}
              onChangeText={(text) => {
                setNewCommName(text);
                setNewCommSlug(text.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
              }}
            />
            <Text style={styles.label}>Slug (Auto-generated)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. reddy"
              placeholderTextColor="#999"
              value={newCommSlug}
              onChangeText={setNewCommSlug}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.addCommBtn}
              onPress={handleAddCommunity}
              disabled={addingCommunity}
            >
              {addingCommunity ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.addCommBtnText}>Create Community</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Communities List */}
          <View style={styles.commListCard}>
            <Text style={styles.cardTitle}>Community Castes</Text>
            {communities.map((item) => (
              <View key={item.id} style={styles.commListItem}>
                <View>
                  <Text style={styles.commNameText}>{item.name}</Text>
                  <Text style={styles.commSlugText}>Slug: {item.slug}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggleBtn, item.is_active ? styles.toggleBtnActive : styles.toggleBtnInactive]}
                  onPress={() => handleToggleCommunity(item)}
                >
                  <Text style={styles.toggleBtnText}>{item.is_active ? 'Active' : 'Disabled'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : activeTab === 'profiles' ? (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No registered members found.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const bureau = bureaus.find((b) => b.id === item.bureau_id);
            return (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => handleSelectProfile(item)}
                activeOpacity={0.8}
              >
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nameText}>
                      {item.full_name} ({item.gender === 'male' ? 'Groom' : 'Bride'})
                    </Text>
                    <Text style={styles.subText}>
                      🌿 {item.community || 'Community'} · {item.current_place || 'Location'}
                    </Text>
                    <Text style={styles.bureauBadgeText}>
                      🏢 {bureau ? bureau.name : 'Unknown Bureau'}
                    </Text>
                  </View>
                  <View style={styles.rightInfo}>
                    <View
                      style={[
                        styles.statusBadge,
                        item.status === 'approved' && styles.statusApproved,
                        item.status === 'rejected' && styles.statusRejected,
                      ]}
                    >
                      <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.viewLink}>View →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={bureaus.filter((b) => b.status === (activeTab === 'pending_bureaus' ? 'pending' : b.status))}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No marriage bureaus found in this category.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => handleSelectBureau(item)}
              activeOpacity={0.8}
            >
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nameText}>{item.name}</Text>
                  <Text style={styles.subText}>✉️ {item.contact_email} {item.contact_phone ? `· 📞 ${item.contact_phone}` : ''}</Text>
                  {item.location && <Text style={styles.subText}>📍 {item.location}</Text>}
                </View>
                <View style={styles.rightInfo}>
                  <View
                    style={[
                      styles.statusBadge,
                      item.status === 'approved' && styles.statusApproved,
                      item.status === 'rejected' && styles.statusRejected,
                    ]}
                  >
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.viewLink}>View →</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Bureau Detail / Edit Modal */}
      {selectedBureau && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={!!selectedBureau}
          onRequestClose={() => setSelectedBureau(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditingBureau ? 'Edit Bureau Details' : 'Bureau Application Details'}
                </Text>
                <TouchableOpacity onPress={() => setSelectedBureau(null)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {isEditingBureau ? (
                  <View style={styles.editForm}>
                    <Text style={styles.label}>Bureau Name *</Text>
                    <TextInput style={styles.input} value={editBurName} onChangeText={setEditBurName} />

                    <Text style={styles.label}>Contact Email *</Text>
                    <TextInput style={styles.input} value={editBurEmail} onChangeText={setEditBurEmail} keyboardType="email-address" />

                    <Text style={styles.label}>Contact Phone</Text>
                    <TextInput style={styles.input} value={editBurPhone} onChangeText={setEditBurPhone} keyboardType="phone-pad" />

                    <Text style={styles.label}>Location</Text>
                    <TextInput style={styles.input} value={editBurLoc} onChangeText={setEditBurLoc} />

                    <Text style={styles.label}>Admin Password</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={editBurPassword}
                        onChangeText={setEditBurPassword}
                        secureTextEntry={!showEditBurPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => setShowEditBurPassword(!showEditBurPassword)} style={styles.eyeBtn}>
                        <Text style={styles.eyeText}>{showEditBurPassword ? '🙈' : '👁️'}</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Status (pending / approved / rejected)</Text>
                    <TextInput style={styles.input} value={editBurStatus} onChangeText={(text) => setEditBurStatus(text as any)} />

                    <Text style={styles.label}>About Us</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={editBurAbout}
                      onChangeText={setEditBurAbout}
                      multiline
                    />
                  </View>
                ) : (
                  <View>
                    {/* Bureau Logo */}
                    {selectedBureau.logo_url && (() => {
                      const logoUrl = selectedBureau.logo_url.startsWith('http')
                        ? selectedBureau.logo_url
                        : `https://npvmvqminzgbuxibonta.supabase.co/storage/v1/object/public/bureau-logos/${selectedBureau.logo_url}`;
                      return (
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                          <Image
                            source={{ uri: logoUrl }}
                            style={{ width: 100, height: 100, borderRadius: 12 }}
                            contentFit="cover"
                          />
                        </View>
                      );
                    })()}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Bureau Name</Text>
                      <Text style={styles.detailValue}>{selectedBureau.name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Contact Email</Text>
                      <Text style={styles.detailValue}>{selectedBureau.contact_email}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Contact Phone</Text>
                      <Text style={styles.detailValue}>{selectedBureau.contact_phone || 'Not specified'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Location / Region</Text>
                      <Text style={styles.detailValue}>{selectedBureau.location || 'Not specified'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={styles.detailValue}>{selectedBureau.status.toUpperCase()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>About Us</Text>
                      <Text style={[styles.detailValue, { fontWeight: 'normal', textAlign: 'right', flex: 1, marginLeft: 20 }]}>
                        {selectedBureau.about_us || 'No details provided.'}
                      </Text>
                    </View>

                    {selectedBureau.status === 'approved' && selectedBureau.admin_password && (
                      <View style={styles.credentialBox}>
                        <Text style={styles.credentialTitle}>🔑 Admin Login Credentials</Text>
                        <Text style={styles.credentialText}>Username: {selectedBureau.contact_email}</Text>
                        <Text style={styles.credentialText}>Password: {selectedBureau.admin_password}</Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              {/* Action Buttons */}
              {isEditingBureau ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.cancelEditBtn}
                    onPress={() => setIsEditingBureau(false)}
                  >
                    <Text style={styles.cancelEditBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveProfileBtn}
                    onPress={handleSaveBureau}
                    disabled={savingBureau}
                  >
                    {savingBureau ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveProfileBtnText}>Save Bureau</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.actionColumn}>
                  {selectedBureau.status === 'pending' && (
                    <View style={[styles.actionRow, { marginBottom: 12 }]}>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={handleRejectBureau}
                      >
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => {
                          setBureauAdminPassword(selectedBureau.admin_password || '');
                          setIsApproveVisible(true);
                        }}
                      >
                        <Text style={styles.approveBtnText}>Approve Bureau</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.deleteProfileBtn}
                      onPress={handleDeleteBureau}
                    >
                      <Text style={styles.deleteProfileBtnText}>Delete Bureau</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editProfileBtn}
                      onPress={() => setIsEditingBureau(true)}
                    >
                      <Text style={styles.editProfileBtnText}>Edit Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Approve Bureau Modal inside selectedBureau modal */}
              <Modal animationType="fade" transparent={true} visible={isApproveVisible} onRequestClose={() => setIsApproveVisible(false)}>
                <View style={styles.alertOverlay}>
                  <View style={styles.alertCard}>
                    <Text style={styles.alertTitle}>Approve Bureau Application</Text>
                    <Text style={styles.alertDesc}>Enter an access password for their administrator dashboard.</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Enter admin password"
                        placeholderTextColor="#999"
                        secureTextEntry={!showApproveBurPassword}
                        value={bureauAdminPassword}
                        onChangeText={setBureauAdminPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => setShowApproveBurPassword(!showApproveBurPassword)} style={styles.eyeBtn}>
                        <Text style={styles.eyeText}>{showApproveBurPassword ? '🙈' : '👁️'}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.alertButtons}>
                      <TouchableOpacity style={styles.alertCancel} onPress={() => { setIsApproveVisible(false); setShowApproveBurPassword(false); }}>
                        <Text style={styles.alertCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.alertConfirm} onPress={handleApproveBureau}>
                        <Text style={styles.alertConfirmText}>Approve Bureau ✓</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>

            </View>
          </View>
        </Modal>
      )}

      {/* Profile Detail / Edit Modal (Global Member Management) */}
      {selectedProfile && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={!!selectedProfile}
          onRequestClose={() => setSelectedProfile(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditingProfile ? 'Edit Member Details' : 'Member Details'}
                </Text>
                <TouchableOpacity onPress={() => setSelectedProfile(null)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {isEditingProfile ? (
                  <View style={styles.editForm}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput style={styles.input} value={editProfName} onChangeText={setEditProfName} />

                    <Text style={styles.label}>Date of Birth * (YYYY-MM-DD)</Text>
                    <TextInput style={styles.input} value={editProfDob} onChangeText={setEditProfDob} />

                    <Text style={styles.label}>Gender * (male / female)</Text>
                    <TextInput style={styles.input} value={editProfGender} onChangeText={setEditProfGender} />

                    <Text style={styles.label}>Caste / Community</Text>
                    <TextInput style={styles.input} value={editProfComm} onChangeText={setEditProfComm} />

                    <Text style={styles.label}>Occupation</Text>
                    <TextInput style={styles.input} value={editProfOcc} onChangeText={setEditProfOcc} />

                    <Text style={styles.label}>Salary</Text>
                    <TextInput style={styles.input} value={editProfSalary} onChangeText={setEditProfSalary} keyboardType="numeric" />

                    <Text style={styles.label}>Salary Currency</Text>
                    <TextInput style={styles.input} value={editProfSalaryCurr} onChangeText={setEditProfSalaryCurr} />

                    <Text style={styles.label}>Current City Location</Text>
                    <TextInput style={styles.input} value={editProfCurrPlace} onChangeText={setEditProfCurrPlace} />

                    <Text style={styles.label}>Native Location</Text>
                    <TextInput style={styles.input} value={editProfNatPlace} onChangeText={setEditProfNatPlace} />

                    <Text style={styles.label}>Contact Phone</Text>
                    <TextInput style={styles.input} value={editProfPhone} onChangeText={setEditProfPhone} keyboardType="phone-pad" />

                    <Text style={styles.label}>Contact Email</Text>
                    <TextInput style={styles.input} value={editProfEmail} onChangeText={setEditProfEmail} keyboardType="email-address" />

                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={editProfPassword}
                        onChangeText={setEditProfPassword}
                        secureTextEntry={!showEditProfPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => setShowEditProfPassword(!showEditProfPassword)} style={styles.eyeBtn}>
                        <Text style={styles.eyeText}>{showEditProfPassword ? '🙈' : '👁️'}</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Status (pending / approved / rejected)</Text>
                    <TextInput style={styles.input} value={editProfStatus} onChangeText={(text) => setEditProfStatus(text as any)} />

                    <Text style={styles.label}>Rejection Reason</Text>
                    <TextInput style={styles.input} value={editProfRejection} onChangeText={setEditProfRejection} />

                    <Text style={styles.label}>Partner Preferences</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={editProfPartnerPref}
                      onChangeText={setEditProfPartnerPref}
                      multiline
                    />
                  </View>
                ) : (
                  <View>
                    {/* Photos Section */}
                    {loadingImages ? (
                      <View style={styles.photosLoadingBox}>
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
                          <Image source={{ uri: profileImages[currentImageIndex]?.signedUrl }} style={styles.mainPhoto} contentFit="cover" />
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
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailRow}>
                            {profileImages.map((img, idx) => (
                              <TouchableOpacity key={idx} onPress={() => setCurrentImageIndex(idx)} style={[styles.thumbnailWrapper, currentImageIndex === idx && styles.thumbnailWrapperActive]}>
                                <Image source={{ uri: img.signedUrl }} style={styles.thumbnail} contentFit="cover" />
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        )}
                        <Text style={styles.photoCountText}>{currentImageIndex + 1} / {profileImages.length}</Text>
                      </View>
                    ) : (
                      <View style={styles.noPhotoBox}>
                        <Text style={{ fontSize: 40 }}>👤</Text>
                        <Text style={styles.photosLoadingText}>No photos uploaded</Text>
                      </View>
                    )}

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Full Name</Text>
                      <Text style={styles.detailValue}>{selectedProfile.full_name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Gender</Text>
                      <Text style={styles.detailValue}>{selectedProfile.gender}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date of Birth</Text>
                      <Text style={styles.detailValue}>{selectedProfile.dob}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Caste / Community</Text>
                      <Text style={styles.detailValue}>{selectedProfile.community || 'Not specified'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Location</Text>
                      <Text style={styles.detailValue}>{selectedProfile.current_place || 'Not specified'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Native Place</Text>
                      <Text style={styles.detailValue}>{selectedProfile.native_place || 'Not specified'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Occupation</Text>
                      <Text style={styles.detailValue}>{selectedProfile.occupation || 'Not specified'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email</Text>
                      <Text style={styles.detailValue}>{selectedProfile.email || 'Not specified'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone</Text>
                      <Text style={styles.detailValue}>{selectedProfile.phone || 'Not specified'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <View style={[styles.statusBadge, selectedProfile.status === 'approved' && styles.statusApproved, selectedProfile.status === 'rejected' && styles.statusRejected]}>
                        <Text style={styles.statusText}>{selectedProfile.status.toUpperCase()}</Text>
                      </View>
                    </View>

                    {selectedProfile.last_password && (
                      <View style={styles.credentialBox}>
                        <Text style={styles.credentialTitle}>🔑 Account Password</Text>
                        <Text style={styles.credentialText}>Plain Password: {selectedProfile.last_password}</Text>
                      </View>
                    )}

                    {selectedProfile.rejection_reason && (
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
                <View>
                  {selectedProfile.status === 'pending' && (
                    <View style={[styles.actionRow, { marginBottom: 10 }]}>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => {
                          setMemberPassword(selectedProfile.last_password || '');
                          setIsApproveProfVisible(true);
                        }}
                      >
                        <Text style={styles.approveBtnText}>✓ Approve Member</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.deleteProfileBtn} onPress={handleDeleteProfile}>
                      <Text style={styles.deleteProfileBtnText}>Delete Member</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editProfileBtn} onPress={() => setIsEditingProfile(true)}>
                      <Text style={styles.editProfileBtnText}>Edit Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Approve Profile Modal inside selectedProfile modal */}
              <Modal animationType="fade" transparent={true} visible={isApproveProfVisible} onRequestClose={() => setIsApproveProfVisible(false)}>
                <View style={styles.alertOverlay}>
                  <View style={styles.alertCard}>
                    <Text style={styles.alertTitle}>Approve Member Profile</Text>
                    <Text style={styles.alertDesc}>Enter or verify the access password to issue to this member.</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Enter member password"
                        placeholderTextColor="#999"
                        secureTextEntry={!showApproveProfPassword}
                        value={memberPassword}
                        onChangeText={setMemberPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => setShowApproveProfPassword(!showApproveProfPassword)} style={styles.eyeBtn}>
                        <Text style={styles.eyeText}>{showApproveProfPassword ? '🙈' : '👁️'}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.alertButtons}>
                      <TouchableOpacity style={styles.alertCancel} onPress={() => { setIsApproveProfVisible(false); setMemberPassword(''); setShowApproveProfPassword(false); }}>
                        <Text style={styles.alertCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.alertConfirm} onPress={handleApproveProfile}>
                        <Text style={styles.alertConfirmText}>Approve Member ✓</Text>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE2',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C1B1F',
  },
  subtitle: {
    fontSize: 12,
    color: '#8B1E3F',
    fontWeight: '600',
    marginTop: 2,
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: '#E3CFCF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  signOutBtnText: {
    color: '#B23B3B',
    fontSize: 12,
    fontWeight: '600',
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE2',
    maxHeight: 48,
  },
  tabScrollContent: {
    paddingHorizontal: 10,
    height: 48,
  },
  tabButton: {
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#8B1E3F',
  },
  tabButtonText: {
    fontSize: 12,
    color: '#998E90',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#8B1E3F',
  },
  listContent: {
    padding: 16,
  },
  listItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C1B1F',
  },
  subText: {
    fontSize: 12,
    color: '#706064',
    marginTop: 4,
  },
  bureauBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B1E3F',
    marginTop: 6,
  },
  rightInfo: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFF2E0',
  },
  statusApproved: {
    backgroundColor: '#E8F5E9',
  },
  statusRejected: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#E65100',
  },
  viewLink: {
    fontSize: 13,
    color: '#8B1E3F',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#998E90',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: '#2C1B1F',
  },
  closeBtn: {
    fontSize: 18,
    color: '#706064',
    padding: 4,
  },
  modalScroll: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF8F5',
  },
  detailLabel: {
    fontSize: 13,
    color: '#998E90',
  },
  detailValue: {
    fontSize: 14,
    color: '#2C1B1F',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionColumn: {
    flexDirection: 'column',
  },
  rejectBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3CFCF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  rejectBtnText: {
    color: '#B23B3B',
    fontWeight: '600',
    fontSize: 14,
  },
  approveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteProfileBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3CFCF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteProfileBtnText: {
    color: '#B23B3B',
    fontWeight: '600',
    fontSize: 14,
  },
  editProfileBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#8B1E3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelEditBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelEditBtnText: {
    color: '#706064',
    fontSize: 14,
    fontWeight: '600',
  },
  saveProfileBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  editForm: {
    paddingBottom: 20,
  },
  credentialBox: {
    backgroundColor: '#F4F9F4',
    borderColor: '#C8E6C9',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  credentialTitle: {
    color: '#2E7D32',
    fontWeight: '700',
    fontSize: 13,
  },
  credentialText: {
    color: '#1B5E20',
    fontSize: 13,
    marginTop: 4,
  },
  rejectionBox: {
    backgroundColor: '#FDF5F5',
    borderColor: '#FFCDD2',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  rejectionTitle: {
    color: '#D32F2F',
    fontWeight: '700',
    fontSize: 13,
  },
  rejectionText: {
    color: '#B71C1C',
    fontSize: 13,
    marginTop: 4,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C1B1F',
    marginBottom: 8,
  },
  alertDesc: {
    fontSize: 13,
    color: '#706064',
    lineHeight: 18,
    marginBottom: 16,
  },
  alertInput: {
    height: 46,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: '#FCFAF6',
    marginBottom: 20,
  },
  alertButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  alertCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  alertCancelText: {
    color: '#998E90',
    fontSize: 14,
    fontWeight: '600',
  },
  alertConfirm: {
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  alertConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Photo styles
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
  photosLoadingBox: { height: 160, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FAF7F2', borderRadius: 16, marginBottom: 16 },
  photosLoadingText: { fontSize: 13, color: '#998E90' },
  mainPhoto: { width: '100%', height: 240, borderRadius: 16, backgroundColor: '#F0EAE5' },
  thumbnailRow: { marginTop: 10 },
  thumbnailWrapper: { width: 56, height: 56, borderRadius: 8, overflow: 'hidden', marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  thumbnailWrapperActive: { borderColor: '#8B1E3F' },
  thumbnail: { width: '100%', height: '100%' },
  photoCountText: { fontSize: 11, color: '#998E90', marginTop: 6, textAlign: 'center' },
  noPhotoBox: { height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF5EE', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EFEAE2' },
  scrollContent: {
    padding: 20,
  },
  addCommCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginBottom: 20,
  },
  addCommBtn: {
    height: 46,
    backgroundColor: '#8B1E3F',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  addCommBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  commListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  commListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF8F5',
  },
  commNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C1B1F',
  },
  commSlugText: {
    fontSize: 11,
    color: '#998E90',
    marginTop: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  toggleBtnActive: {
    backgroundColor: '#E8F5E9',
  },
  toggleBtnInactive: {
    backgroundColor: '#FFEBEE',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  createCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  cardTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 18,
    fontWeight: '700',
    color: '#2C1B1F',
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#706064',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  secDesc: {
    fontSize: 12,
    color: '#998E90',
    marginBottom: 12,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#FCFAF6',
    marginBottom: 16,
    color: '#2C1B1F',
  },
  textArea: {
    height: 100,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  submitBtn: {
    height: 48,
    backgroundColor: '#8B1E3F',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  genderBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCFAF6',
  },
  genderBtnActive: {
    borderColor: '#8B1E3F',
    backgroundColor: '#FDF7F8',
  },
  genderBtnText: {
    fontSize: 13,
    color: '#706064',
    fontWeight: '600',
  },
  genderBtnTextActive: {
    color: '#8B1E3F',
  },
  commGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  commChip: {
    backgroundColor: '#FCFAF6',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  commChipActive: {
    backgroundColor: '#8B1E3F',
    borderColor: '#8B1E3F',
  },
  commChipText: {
    fontSize: 12,
    color: '#706064',
    fontWeight: '500',
  },
  commChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  burGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  burChip: {
    backgroundColor: '#FCFAF6',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  burChipActive: {
    backgroundColor: '#8B1E3F',
    borderColor: '#8B1E3F',
  },
  burChipText: {
    fontSize: 13,
    color: '#706064',
    fontWeight: '600',
  },
  burChipTextActive: {
    color: '#FFFFFF',
  },
  errorText: {
    color: '#B23B3B',
    fontSize: 12,
  },
  labelApproved: {
    color: '#2E7D32',
  },
  labelRejected: {
    color: '#B23B3B',
  },
  labelPending: {
    color: '#E65100',
  },
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
