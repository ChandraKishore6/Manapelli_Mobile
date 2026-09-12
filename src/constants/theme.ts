/**
 * ManaPelli Design System Tokens & Theme Configuration
 * Premium Matrimony Aesthetic: Warm Cream, Burgundy, Rose Gold accents, and Tiered Depth
 */

import '@/global.css';
import { Platform } from 'react-native';

export const BrandColors = {
  burgundy: '#8B1E3F',
  burgundyDark: '#6A152E',
  burgundyLight: '#A82B51',
  burgundySoft: '#FDF7F8',
  gold: '#D4AF37',
  goldSoft: '#FAF3E0',
  cream: '#FAF7F2',
  creamDark: '#F4ECE1',
  cardBg: '#FCFAF6',
  white: '#FFFFFF',
  textPrimary: '#2C1B1F',
  textSecondary: '#706064',
  textMuted: '#998E90',
  borderLight: '#EFEAE2',
  borderMedium: '#E5DEC8',
  success: '#2E7D32',
  successBg: '#E8F5E9',
  error: '#B23B3B',
  errorBg: '#FDECEA',
  warning: '#A07020',
  warningBg: '#FFF8E1',
};

export const Colors = {
  light: {
    text: BrandColors.textPrimary,
    textSecondary: BrandColors.textSecondary,
    background: BrandColors.cream,
    backgroundElement: BrandColors.creamDark,
    backgroundSelected: BrandColors.burgundySoft,
    card: BrandColors.cardBg,
    primary: BrandColors.burgundy,
    border: BrandColors.borderLight,
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#B0A8AA',
    background: '#1A1215',
    backgroundElement: '#261C20',
    backgroundSelected: '#3D1C26',
    card: '#241B1F',
    primary: '#D43F6B',
    border: '#3A2E33',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'System',
    mono: 'Courier',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "'Playfair Display', Georgia, serif",
    rounded: "Inter, sans-serif",
    mono: "monospace",
  },
});

export const Typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  title1: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  title2: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  subtitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  bodySm: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: '500' as const },
};

export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#2C1B1F',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
    },
    android: { elevation: 2 },
    default: {
      boxShadow: '0 2px 6px rgba(44, 27, 31, 0.05)',
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#2C1B1F',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.09,
      shadowRadius: 14,
    },
    android: { elevation: 4 },
    default: {
      boxShadow: '0 4px 14px rgba(44, 27, 31, 0.09)',
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#2C1B1F',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
    default: {
      boxShadow: '0 8px 24px rgba(44, 27, 31, 0.14)',
    },
  }),
};

export const Radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  full: 9999,
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

