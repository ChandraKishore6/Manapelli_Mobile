import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BrandColors, Radius } from '@/constants/theme';

interface ShimmerProps {
  width?: number | `${number}%` | 'auto';
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const ShimmerPlaceholder: React.FC<ShimmerProps> = ({
  width = '100%',
  height = 20,
  borderRadius = Radius.sm,
  style,
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.8, { duration: 800, easing: Easing.ease }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View
      style={[
        styles.container,
        { width: width as any, height, borderRadius },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmer, animatedStyle]} />
    </View>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <View style={styles.cardSkeleton}>
      <ShimmerPlaceholder height={380} borderRadius={Radius.lg} />
      <View style={styles.contentPadding}>
        <ShimmerPlaceholder width="60%" height={24} style={{ marginBottom: 10 }} />
        <ShimmerPlaceholder width="40%" height={16} style={{ marginBottom: 14 }} />
        <ShimmerPlaceholder width="90%" height={14} style={{ marginBottom: 8 }} />
        <ShimmerPlaceholder width="75%" height={14} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: BrandColors.borderLight,
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
    backgroundColor: BrandColors.creamDark,
  },
  cardSkeleton: {
    backgroundColor: BrandColors.cardBg,
    borderRadius: Radius.lg,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
  },
  contentPadding: {
    paddingTop: 16,
    paddingHorizontal: 4,
  },
});
