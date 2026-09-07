export const colors = {
  primary: '#F57D01',
  primaryDark: '#D96A00',
  primaryLight: '#FF9A33',
  primaryMuted: '#FFEAD5',
  secondary: '#1F2937',
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceMuted: '#F3F4F6',
  border: '#E2E8F0',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(15, 23, 42, 0.55)',
  google: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  fontFamily: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semibold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    hero: 32,
  },
} as const;
