export const Palette = {
  // Brand colors
  primary: '#0F9D8A',
  primaryDark: '#0B7A6B',
  primaryLight: '#48C9B0',
  deepTeal: '#0B3C49',
  accentAmber: '#F5A524',
  success: '#2E9E5B',
  danger: '#D64545',
  warning: '#E67E22',
  info: '#2980B9',

  // Light theme neutrals
  light: {
    background: '#F7FAF9',
    card: '#FFFFFF',
    text: '#132E27',
    textSecondary: '#627D77',
    textTertiary: '#9EABA7',
    border: '#E0EAE7',
    borderSubtle: '#EDF3F1',
    tint: '#0F9D8A',
    surfaceVariant: '#EEF5F3',
    elevated: '#FFFFFF',
  },

  // Dark theme neutrals
  dark: {
    background: '#0E1A1D',
    card: '#16262B',
    text: '#E8F1EF',
    textSecondary: '#8CA59F',
    textTertiary: '#5C746E',
    border: '#22383E',
    borderSubtle: '#1A2D32',
    tint: '#48C9B0',
    surfaceVariant: '#1D3036',
    elevated: '#20343A',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  massive: 64,
} as const;

export const Radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
} as const;

export const Typography = {
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600' as const,
  },
  title3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700' as const,
  },
  title2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700' as const,
  },
  title1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700' as const,
  },
  hero: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '800' as const,
  },
  timer: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '800' as const,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
  },
} as const;

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderSubtle: string;
  tint: string;
  surfaceVariant: string;
  elevated: string;
}
export type SpacingScale = typeof Spacing;
export type RadiusScale = typeof Radius;
export type TypographyScale = typeof Typography;

export interface AppTheme {
  colors: ThemeColors;
  isDark: boolean;
  spacing: SpacingScale;
  radius: RadiusScale;
  typography: TypographyScale;
}
