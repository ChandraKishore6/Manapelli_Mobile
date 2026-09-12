import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandColors, Shadows, Radius } from '@/constants/theme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

import HomeScreen from '../app/index';
import MyProfileScreen from '../app/explore';
import ProfileDetailScreen from '../app/profile/[id]';
import FavoritesScreen from '../app/favorites';
import InterestsScreen from '../app/interests';
import ChatsListScreen from '../app/chats';
import ChatDetailScreen from '../app/chat/[id]';
import ProfileViewsScreen from '../app/views';

export type NavRoute = 
  | { screen: 'home' }
  | { screen: 'favorites' }
  | { screen: 'interests' }
  | { screen: 'chats' }
  | { screen: 'profile' }
  | { screen: 'chat_detail'; peerProfileId: string }
  | { screen: 'views' }
  | { screen: 'profile_detail'; profileId: string };

export default function AppTabs() {
  const [navStack, setNavStack] = useState<NavRoute[]>([{ screen: 'home' }]);
  const insets = useSafeAreaInsets();

  const currentRoute = navStack[navStack.length - 1];
  const isRootTab = navStack.length === 1;

  const pushScreen = (route: NavRoute) => {
    setNavStack((prev) => [...prev, route]);
  };

  const popScreen = () => {
    setNavStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const switchTab = (tab: 'home' | 'favorites' | 'interests' | 'chats' | 'profile') => {
    setNavStack([{ screen: tab }]);
  };

  const activeTabName = isRootTab && ['favorites', 'interests', 'chats', 'profile'].includes(currentRoute.screen)
    ? currentRoute.screen
    : 'home';

  const renderActiveScreen = () => {
    switch (currentRoute.screen) {
      case 'home':
        return (
          <HomeScreen
            onViewProfile={(id) => pushScreen({ screen: 'profile_detail', profileId: id })}
            onOpenInterests={() => switchTab('interests')}
            onOpenChats={() => switchTab('chats')}
            onOpenViews={() => pushScreen({ screen: 'views' })}
            onOpenChat={(id) => pushScreen({ screen: 'chat_detail', peerProfileId: id })}
          />
        );
      case 'favorites':
        return (
          <FavoritesScreen
            onViewProfile={(id) => pushScreen({ screen: 'profile_detail', profileId: id })}
          />
        );
      case 'interests':
        return (
          <InterestsScreen
            onBack={() => switchTab('home')}
            onViewProfile={(id) => pushScreen({ screen: 'profile_detail', profileId: id })}
            onOpenChat={(id) => pushScreen({ screen: 'chat_detail', peerProfileId: id })}
          />
        );
      case 'chats':
        return (
          <ChatsListScreen
            onBack={() => switchTab('home')}
            onOpenChat={(id) => pushScreen({ screen: 'chat_detail', peerProfileId: id })}
          />
        );
      case 'profile':
        return <MyProfileScreen />;
      case 'chat_detail':
        return (
          <ChatDetailScreen
            peerProfileId={currentRoute.peerProfileId}
            onBack={popScreen}
            onViewProfile={(id) => pushScreen({ screen: 'profile_detail', profileId: id })}
          />
        );
      case 'views':
        return (
          <ProfileViewsScreen
            onBack={popScreen}
            onViewProfile={(id) => pushScreen({ screen: 'profile_detail', profileId: id })}
            onOpenChat={(id) => pushScreen({ screen: 'chat_detail', peerProfileId: id })}
          />
        );
      case 'profile_detail':
        return (
          <ProfileDetailScreen
            id={currentRoute.profileId}
            onBack={popScreen}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Active Screen Container */}
      <View style={styles.screenContainer}>
        {renderActiveScreen()}
      </View>

      {/* Dynamic Floating Bottom Tab Bar - Rendered when on root tabs */}
      {isRootTab && (
        <View style={[styles.tabBarContainer, { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 10 }]}>
          <View style={styles.tabBar}>
            <AnimatedPressable
              style={[styles.tabItem, activeTabName === 'home' && styles.activeTabItem]}
              onPress={() => switchTab('home')}
            >
              <Text style={styles.tabIcon}>🏠</Text>
              <Text style={[styles.tabLabel, activeTabName === 'home' && styles.tabActiveText]}>
                Matches
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[styles.tabItem, activeTabName === 'favorites' && styles.activeTabItem]}
              onPress={() => switchTab('favorites')}
            >
              <Text style={styles.tabIcon}>
                {activeTabName === 'favorites' ? '💖' : '🤍'}
              </Text>
              <Text style={[styles.tabLabel, activeTabName === 'favorites' && styles.tabActiveText]}>
                Favorites
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[styles.tabItem, activeTabName === 'interests' && styles.activeTabItem]}
              onPress={() => switchTab('interests')}
            >
              <Text style={styles.tabIcon}>💌</Text>
              <Text style={[styles.tabLabel, activeTabName === 'interests' && styles.tabActiveText]}>
                Interests
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[styles.tabItem, activeTabName === 'chats' && styles.activeTabItem]}
              onPress={() => switchTab('chats')}
            >
              <Text style={styles.tabIcon}>💬</Text>
              <Text style={[styles.tabLabel, activeTabName === 'chats' && styles.tabActiveText]}>
                Chats
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[styles.tabItem, activeTabName === 'profile' && styles.activeTabItem]}
              onPress={() => switchTab('profile')}
            >
              <Text style={styles.tabIcon}>👤</Text>
              <Text style={[styles.tabLabel, activeTabName === 'profile' && styles.tabActiveText]}>
                Profile
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.cream,
  },
  screenContainer: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: BrandColors.white,
    borderTopWidth: 1,
    borderTopColor: BrandColors.borderLight,
    paddingTop: 8,
    ...Shadows.md,
  },
  tabBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    borderRadius: Radius.md,
    paddingVertical: 2,
  },
  activeTabItem: {
    backgroundColor: BrandColors.burgundySoft,
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: BrandColors.textMuted,
    marginTop: 2,
  },
  tabActiveText: {
    color: BrandColors.burgundy,
    fontWeight: '700',
  },
});

