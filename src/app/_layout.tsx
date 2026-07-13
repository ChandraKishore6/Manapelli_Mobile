import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { useEffect, useState } from 'react';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import LoginScreen from './login';
import RegisterProfileScreen from './register-profile';
import WelcomeScreen from './welcome';
import RegisterBureauScreen from './register-bureau';
import BureauDashboard from './bureau-dashboard';
import MasterDashboard from './master-dashboard';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { session, loading, role } = useAuth();
  const [view, setView] = useState<'welcome' | 'login' | 'register_profile' | 'register_bureau'>('welcome');
  const [loginPortalType, setLoginPortalType] = useState<'user' | 'bureau_admin' | 'master_admin'>('user');
  const [preselectedCommunityId, setPreselectedCommunityId] = useState('');
  const [preselectedBureauId, setPreselectedBureauId] = useState('');
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch((err) => {
        console.warn('Failed to hide splash screen:', err);
      });
    }
  }, [loading]);

  if (loading) {
    return null;
  }

  // Define screen layout content based on authentication state and user role
  const renderContent = () => {
    if (!session) {
      switch (view) {
        case 'login':
          return (
            <LoginScreen
              portalType={loginPortalType}
              onShowWelcome={() => setView('welcome')}
              onShowRegister={() => {
                setPreselectedCommunityId('');
                setPreselectedBureauId('');
                setView('register_profile');
              }}
            />
          );
        case 'register_profile':
          return (
            <RegisterProfileScreen
              onShowLogin={() => setView('login')}
              onShowWelcome={() => setView('welcome')}
              initialCommunityId={preselectedCommunityId}
              initialBureauId={preselectedBureauId}
            />
          );
        case 'register_bureau':
          return <RegisterBureauScreen onShowWelcome={() => setView('welcome')} />;
        default:
          return (
            <WelcomeScreen
              onShowMemberLogin={() => {
                setLoginPortalType('user');
                setView('login');
              }}
              onShowBureauLogin={() => {
                setLoginPortalType('bureau_admin');
                setView('login');
              }}
              onShowMasterLogin={() => {
                setLoginPortalType('master_admin');
                setView('login');
              }}
              onShowRegisterProfile={() => {
                setPreselectedCommunityId('');
                setPreselectedBureauId('');
                setView('register_profile');
              }}
              onShowRegisterBureau={() => setView('register_bureau')}
              onShowRegisterProfileWithDetails={(commId, burId) => {
                setPreselectedCommunityId(commId);
                setPreselectedBureauId(burId);
                setView('register_profile');
              }}
            />
          );
      }
    }

    // Authenticated role routing
    if (role) {
      switch (role.role) {
        case 'master_admin':
          return <MasterDashboard />;
        case 'bureau_admin':
          return <BureauDashboard />;
        default:
          return <AppTabs />;
      }
    }

    return <AppTabs />; // Default fallback
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {renderContent()}
    </ThemeProvider>
  );
}

import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
