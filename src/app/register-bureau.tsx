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
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

interface Community {
  id: string;
  name: string;
}

interface RegisterBureauProps {
  onShowWelcome: () => void;
}

export default function RegisterBureauScreen({ onShowWelcome }: RegisterBureauProps) {
  const [bureauName, setBureauName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [location, setLocation] = useState('');
  const [aboutUs, setAboutUs] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  
  const [loadingComms, setLoadingComms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [eulaAccepted, setEulaAccepted] = useState(false);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const { data, error } = await supabase
          .from('communities')
          .select('id, name')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error(error.message);
        } else if (data) {
          setCommunities(data as Community[]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingComms(false);
      }
    };
    fetchCommunities();
  }, []);

  const handlePickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please grant photo gallery permission to choose a logo');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleToggleCommunity = (id: string) => {
    setSelectedCommunities((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!eulaAccepted) {
      Alert.alert('Terms of Use', 'You must agree to the Terms of Use (EULA) before submitting.');
      return;
    }
    if (!bureauName || !contactEmail) {
      Alert.alert('Error', 'Bureau Name and Contact Email are required');
      return;
    }
    if (selectedCommunities.length === 0) {
      Alert.alert('Error', 'Please select at least one community served by your bureau');
      return;
    }

    setSubmitting(true);
    try {
      let uploadedLogoPath = null;
      if (logoUri) {
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
            xhr.open("GET", logoUri, true);
            xhr.send(null);
          });
          
          const fileExt = logoUri.split('.').pop()?.toLowerCase() || 'jpg';
          const filename = `${Math.random().toString(36).substring(7)}.${fileExt}`;
          const storagePath = `logos/${filename}`;

          const { error: uploadError } = await supabase.storage
            .from('bureau-logos')
            .upload(storagePath, arrayBuffer, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
            });

          if (uploadError) {
            console.error('Failed to upload bureau logo:', uploadError.message);
            Alert.alert('Upload Error', `Failed to upload logo: ${uploadError.message}`);
          } else {
            // Store the full public URL so it loads everywhere without conversion
            const { data: publicUrlData } = supabase.storage
              .from('bureau-logos')
              .getPublicUrl(storagePath);
            uploadedLogoPath = publicUrlData?.publicUrl || storagePath;
          }
        } catch (err: any) {
          console.error('Logo reading error:', err);
          Alert.alert('Logo Error', `Failed to process logo image: ${err.message || err}`);
        }
      }

      // Submit application using our database RPC helper
      const { data: newBureauId, error: submitError } = await supabase.rpc(
        'submit_bureau_application',
        {
          p_name: bureauName,
          p_email: contactEmail,
          p_phone: contactPhone || null,
          p_location: location || null,
          p_about_us: aboutUs || null,
          p_logo_url: uploadedLogoPath,
          p_community_ids: selectedCommunities,
        }
      );

      if (submitError) {
        Alert.alert('Submission Failed', submitError.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
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
          <Text style={styles.successTitle}>Bureau Application Sent!</Text>
          <Text style={styles.successDescription}>
            Your marriage bureau registration request has been submitted successfully to the platform administrator.
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>
              We will review your application and contact you at your admin email ({contactEmail}) with your bureau dashboard access credentials once approved.
            </Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={onShowWelcome}>
            <Text style={styles.primaryBtnText}>Return to Welcome Page</Text>
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
          <TouchableOpacity onPress={onShowWelcome} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register a Bureau</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Apply as a Bureau</Text>
            <Text style={styles.sectionSubtitle}>
              Create a custom community matrimony portal on ManaPelli. Manage your own members and verified credentials.
            </Text>

            {/* Logo Upload */}
            <Text style={styles.label}>Bureau Logo</Text>
            <View style={styles.logoUploadRow}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoPreview} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderText}>🏢</Text>
                </View>
              )}
              <TouchableOpacity style={styles.pickLogoBtn} onPress={handlePickLogo}>
                <Text style={styles.pickLogoBtnText}>Choose Logo</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Bureau Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lotus Alliance Matrimony"
              placeholderTextColor="#999"
              value={bureauName}
              onChangeText={setBureauName}
            />

            <Text style={styles.label}>Admin Email (for login) *</Text>
            <TextInput
              style={styles.input}
              placeholder="admin@bureauname.com"
              placeholderTextColor="#999"
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Contact Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 XXXXX XXXXX"
              placeholderTextColor="#999"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Location / Region</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Chennai, Tamil Nadu"
              placeholderTextColor="#999"
              value={location}
              onChangeText={setLocation}
            />

            {/* Communities Served Selection */}
            <Text style={styles.label}>Communities Served *</Text>
            <Text style={styles.sectionDescription}>Select communities your bureau specializes in matching.</Text>
            {loadingComms ? (
              <ActivityIndicator size="small" color="#8B1E3F" style={{ marginVertical: 10 }} />
            ) : (
              <View style={styles.commGrid}>
                {communities.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.commChip,
                      selectedCommunities.includes(c.id) && styles.commChipActive,
                    ]}
                    onPress={() => handleToggleCommunity(c.id)}
                  >
                    <Text
                      style={[
                        styles.commChipText,
                        selectedCommunities.includes(c.id) && styles.commChipTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.label, { marginTop: 20 }]}>About our Bureau</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your history, communities you serve, and background verification standards..."
              placeholderTextColor="#999"
              value={aboutUs}
              onChangeText={setAboutUs}
              multiline
              numberOfLines={6}
            />

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setEulaAccepted(!eulaAccepted)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, eulaAccepted && styles.checkboxChecked]}>
                {eulaAccepted && <Text style={styles.checkboxCheckmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                I agree to the <Text style={{ textDecorationLine: 'underline', color: '#8B1E3F' }}>Terms of Use (EULA)</Text> and understand that ManaPelli has a zero-tolerance policy for objectionable content or abusive users, and abusive accounts are terminated immediately.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 24 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Submit Bureau Application</Text>
              )}
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    padding: 20,
    flexGrow: 1,
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
  logoUploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  logoPreview: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#FCFAF6',
    borderWidth: 1,
    borderColor: '#E6E0D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    fontSize: 24,
  },
  pickLogoBtn: {
    borderWidth: 1,
    borderColor: '#E6E0D5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  pickLogoBtnText: {
    fontSize: 13,
    color: '#706064',
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#706064',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontSize: 12,
    color: '#998E90',
    marginBottom: 10,
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
    fontSize: 13,
    color: '#706064',
    fontWeight: '500',
  },
  commChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
});
