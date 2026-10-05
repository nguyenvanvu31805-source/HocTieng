/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const EcoColors = {
  lime: '#CFFF74',
  limeHover: '#bde866',
  limeLight: '#F4FDE2',
  oliveInk: '#2F3A1D',
  oliveInkLight: '#44532B',
  background: '#F8FAF2',
  card: '#FFFFFF',
  border: 'rgba(47, 58, 29, 0.12)',
  borderSolid: '#E5EAD9',
  muted: '#66705A',
  mutedLight: '#8E9A80',
  success: '#2E7D32',
  successBg: '#EDF7ED',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  error: '#D32F2F',
  errorBg: '#FEE2E2',
} as const;

export const Colors = {
  light: {
    text: '#2F3A1D',
    background: '#F8FAF2',
    backgroundElement: '#F0F4E8',
    backgroundSelected: '#E6F8BE',
    textSecondary: '#66705A',
  },
  dark: {
    text: '#ffffff',
    background: '#1A2111',
    backgroundElement: '#252F18',
    backgroundSelected: '#334021',
    textSecondary: '#A2B092',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

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
