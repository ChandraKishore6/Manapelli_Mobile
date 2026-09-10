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

export default function AppTabs() {
  const [activeTab, setActiveTab] = useState<'home' | 'favorites' | 'profile'>('home');
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  if (viewingProfileId) {
    return (
      <ProfileDetailScreen
        id={viewingProfileId}
        onBack={() => setViewingProfileId(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Active Screen Container */}
      <View style={styles.screenContainer}>
        {activeTab === 'home' ? (
          <HomeScreen onViewProfile={(id) => setViewingProfileId(id)} />
        ) : activeTab === 'favorites' ? (
          <FavoritesScreen onViewProfile={(id) => setViewingProfileId(id)} />
        ) : (
          <MyProfileScreen />
        )}
      </View>

      {/* Tab Bar Container */}
      <View style={[styles.tabBarContainer, { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 8 }]}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('home')}
            activeOpacity={0.8}
          >
            <Text style={styles.tabIcon}>
              {activeTab === 'home' ? '🏠' : '🏠'}
            </Text>
            <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabActiveText]}>
              Matches
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('favorites')}
            activeOpacity={0.8}
          >
            <Text style={styles.tabIcon}>
              {activeTab === 'favorites' ? '💖' : '🤍'}
            </Text>
            <Text style={[styles.tabLabel, activeTab === 'favorites' && styles.tabActiveText]}>
              Favorites
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.tabIcon}>
              {activeTab === 'profile' ? '👤' : '👤'}
            </Text>
            <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabActiveText]}>
              My Profile
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
