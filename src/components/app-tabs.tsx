import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  | { screen: 'profile' }
  | { screen: 'interests' }
  | { screen: 'chats' }
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

  const switchTab = (tab: 'home' | 'favorites' | 'profile') => {
    setNavStack([{ screen: tab }]);
  };

  const activeTabName = isRootTab && (currentRoute.screen === 'favorites' || currentRoute.screen === 'profile')
    ? currentRoute.screen
    : 'home';

  const renderActiveScreen = () => {
    switch (currentRoute.screen) {
      case 'home':
        return (
          <HomeScreen
            onViewProfile={(id) => pushScreen({ screen: 'profile_detail', profileId: id })}
            onOpenInterests={() => pushScreen({ screen: 'interests' })}
            onOpenChats={() => pushScreen({ screen: 'chats' })}
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
      case 'profile':
        return <MyProfileScreen />;
      case 'interests':
        return (
          <InterestsScreen
            onBack={popScreen}
            onViewProfile={(id) => pushScreen({ screen: 'profile_detail', profileId: id })}
            onOpenChat={(id) => pushScreen({ screen: 'chat_detail', peerProfileId: id })}
          />
        );
      case 'chats':
        return (
          <ChatsListScreen
            onBack={popScreen}
            onOpenChat={(id) => pushScreen({ screen: 'chat_detail', peerProfileId: id })}
          />
        );
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

      {/* Tab Bar Container - Only rendered when on root tab screens */}
      {isRootTab && (
        <View style={[styles.tabBarContainer, { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 8 }]}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => switchTab('home')}
              activeOpacity={0.8}
            >
              <Text style={styles.tabIcon}>🏠</Text>
              <Text style={[styles.tabLabel, activeTabName === 'home' && styles.tabActiveText]}>
                Matches
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => switchTab('favorites')}
              activeOpacity={0.8}
            >
              <Text style={styles.tabIcon}>
                {activeTabName === 'favorites' ? '💖' : '🤍'}
              </Text>
              <Text style={[styles.tabLabel, activeTabName === 'favorites' && styles.tabActiveText]}>
                Favorites
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => switchTab('profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.tabIcon}>👤</Text>
              <Text style={[styles.tabLabel, activeTabName === 'profile' && styles.tabActiveText]}>
                My Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  screenContainer: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
    paddingTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 4,
  },
  tabBar: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#998E90',
    marginTop: 2,
  },
  tabActiveText: {
    color: '#8B1E3F',
    fontWeight: '700',
  },
});
