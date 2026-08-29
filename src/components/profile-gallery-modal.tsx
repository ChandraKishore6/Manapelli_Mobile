import React, { useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ProfileGalleryModalProps {
  visible: boolean;
  images: { signed_url?: string | null; storage_path: string; is_cover?: boolean }[];
  initialIndex?: number;
  candidateName?: string;
  onClose: () => void;
}

export function ProfileGalleryModal({
  visible,
  images,
  initialIndex = 0,
  candidateName,
  onClose,
}: ProfileGalleryModalProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  if (!visible || images.length === 0) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.titleText}>{candidateName || 'Candidate Photos'}</Text>
            <Text style={styles.subtitleText}>
              Photo {activeIndex + 1} of {images.length}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Main Photo Viewer */}
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: images[activeIndex]?.signed_url || undefined }}
            style={styles.mainPhoto}
            contentFit="contain"
          />

          {/* Protective Watermark */}
          <View style={styles.watermarkOverlay}>
            <Text style={styles.watermarkText}>ManaPelli ❤️ Official</Text>
          </View>
        </View>

        {/* Bottom Thumbnail Strip */}
        {images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailStrip}
          >
            {images.map((img, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setActiveIndex(idx)}
                style={[
                  styles.thumbnailWrapper,
                  idx === activeIndex && styles.activeThumbnailWrapper,
                ]}
              >
                <Image
                  source={{ uri: img.signed_url || undefined }}
                  style={styles.thumbnailPhoto}
                  contentFit="cover"
                />
                {img.is_cover && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitleText: {
    color: '#A09094',
    fontSize: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mainPhoto: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
  },
  watermarkOverlay: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  watermarkText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  thumbnailStrip: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 10,
    alignItems: 'center',
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeThumbnailWrapper: {
    borderColor: '#8B1E3F',
  },
  thumbnailPhoto: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: '#8B1E3F',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  coverBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
});
