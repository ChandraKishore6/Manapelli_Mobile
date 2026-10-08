import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { supabase } from '../lib/supabase';
import { SupportModal } from '../components/support-modal';

interface LoginScreenProps {
  portalType: 'user' | 'bureau_admin' | 'master_admin';
  onShowWelcome: () => void;
  onShowRegister: () => void;
}

export default function LoginScreen({ portalType, onShowWelcome, onShowRegister }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [supportVisible, setSupportVisible] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);

  const getThemeColor = () => {
    if (portalType === 'bureau_admin') return '#1B365D';
    if (portalType === 'master_admin') return '#2F3E46';
    return '#8B1E3F';
  };

  const getPortalTitle = () => {
    switch (portalType) {
      case 'master_admin':
        return 'Master Admin';
      case 'bureau_admin':
        return 'Bureau Admin';
      default:
        return 'Member Sign In';
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('Login Failed', error.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Query user_roles to check if they have permission for this portal
        const { data: roles, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', portalType)
          .limit(1);

        if (roleError) {
          console.error(roleError.message);
          Alert.alert('Access Error', 'Failed to verify account permissions.');
          await supabase.auth.signOut();
        } else if (!roles || roles.length === 0) {
          // Fetch their actual role to show in the error message
          const { data: anyRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', data.user.id)
            .limit(1);
          const roleName = anyRole && anyRole.length > 0 ? anyRole[0].role : 'none';
          Alert.alert(
            'Access Denied',
            `This account is registered as: ${roleName}. You cannot log in to the ${getPortalTitle()} portal.`
          );
          await supabase.auth.signOut();
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onShowWelcome} style={styles.backButton}>
            <Text style={[styles.backArrow, { color: getThemeColor() }]}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getPortalTitle()}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 30, 60) }]}>
          <View style={styles.headerContainer}>
            <View style={[styles.heartBadge, { backgroundColor: getThemeColor(), shadowColor: getThemeColor() }]}>
              <Text style={styles.heartIcon}>❦</Text>
            </View>
            <Text style={styles.titleText}>ManaPelli</Text>
            <Text style={styles.subtitleText}>Trusted Matrimony, Bureau by Bureau</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>{getPortalTitle()}</Text>
            
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <View style={styles.labelRow}>
              <Text style={styles.label}>
                {portalType === 'user' ? 'Issued Password' : 'Password'}
              </Text>
              <TouchableOpacity onPress={() => setForgotVisible(true)}>
                <Text style={[styles.forgotBtnText, { color: getThemeColor() }]}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: getThemeColor(), shadowColor: getThemeColor() }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {portalType === 'user' && (
              <TouchableOpacity
                style={styles.registerLink}
                onPress={onShowRegister}
              >
                <Text style={[styles.registerLinkText, { color: getThemeColor() }]}>New member? Submit a profile →</Text>
              </TouchableOpacity>
            )}

            <View style={styles.helpContainer}>
              <Text style={styles.helpText}>
                {portalType === 'user' 
                  ? 'Your sign-in password is issued by your bureau after approval.'
                  : 'Bureau and Master credentials are created by platform operators.'}
              </Text>
              <TouchableOpacity onPress={() => setSupportVisible(true)}>
                <Text style={[styles.contactText, { color: getThemeColor(), textDecorationLine: 'underline' }]}>
                  Need help? Contact support@manapelli.in
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SupportModal
        visible={supportVisible}
        onClose={() => setSupportVisible(false)}
        prefilledEmail={email}
      />

      <ForgotPasswordModal
        visible={forgotVisible}
        onClose={() => setForgotVisible(false)}
        initialEmail={email}
        themeColor={getThemeColor()}
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
    flexGrow: 1,
    padding: 24,
    paddingBottom: 50,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  heartBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B1E3F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B1E3F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 12,
  },
  heartIcon: {
    fontSize: 24,
    color: '#F4E8D1',
  },
  titleText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C1B1F',
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 13,
    color: '#706064',
    marginTop: 4,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 20,
    fontWeight: '600',
    color: '#2C1B1F',
    marginBottom: 24,
    textAlign: 'center',
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
    height: 52,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#2C1B1F',
    backgroundColor: '#FCFAF6',
    marginBottom: 20,
  },
  loginButton: {
    height: 52,
    backgroundColor: '#8B1E3F',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#8B1E3F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  registerLink: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  registerLinkText: {
    color: '#8B1E3F',
    fontSize: 14,
    fontWeight: '600',
  },
  helpContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2ECE2',
    alignItems: 'center',
  },
  helpText: {
    fontSize: 12,
    color: '#706064',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8B1E3F',
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  forgotBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

function ForgotPasswordModal({
  visible,
  onClose,
  initialEmail = '',
  themeColor = '#8B1E3F',
}: {
  visible: boolean;
  onClose: () => void;
  initialEmail?: string;
  themeColor?: string;
}) {
  const [resetEmail, setResetEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible && initialEmail) {
      setResetEmail(initialEmail);
    }
  }, [visible, initialEmail]);

  const handleSendCredentials = async () => {
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter your registered email address.');
      return;
    }

    setBusy(true);
    try {
      // 1. Check if email exists in profiles table
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', cleanEmail)
        .limit(1)
        .maybeSingle();

      if (profileErr) {
        console.error('Error querying profiles for email:', profileErr.message);
      }

      if (!profileData) {
        Alert.alert(
          'Email Not Registered',
          'This email is not registered in our database. Please check your email address or submit a new profile.'
        );
        setBusy(false);
        return;
      }

      // 2. Trigger password reset link / email credentials via Supabase
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (resetErr) {
        Alert.alert('Error', resetErr.message || 'Could not send reset credentials.');
      } else {
        Alert.alert(
          'Login Credentials Sent 📩',
          'Password reset instructions have been sent to your email inbox!'
        );
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send credentials. Please check your connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>🔑 Forgot Password?</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={modalStyles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={modalStyles.description}>
            Enter your registered email address below. If your email is registered in our database, we will send your login credentials / reset link to your email inbox.
          </Text>
          <Text style={modalStyles.label}>Registered Email Address *</Text>
          <TextInput
            style={modalStyles.input}
            placeholder="e.g. name@example.com"
            placeholderTextColor="#999"
            value={resetEmail}
            onChangeText={setResetEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={modalStyles.btnRow}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose} disabled={busy}>
              <Text style={modalStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.submitBtn, { backgroundColor: themeColor }]}
              onPress={handleSendCredentials}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={modalStyles.submitBtnText}>Send Credentials</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C1B1F',
  },
  closeIcon: {
    fontSize: 18,
    color: '#999',
    padding: 4,
  },
  description: {
    fontSize: 13,
    color: '#706064',
    lineHeight: 19,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#706064',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    borderRadius: 12,
    backgroundColor: '#FCFAF6',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#2C1B1F',
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6E0D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#706064',
  },
  submitBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
