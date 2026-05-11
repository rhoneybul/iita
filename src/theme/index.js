// iita theme — dark, calm, pink accent. Same shape as etapa so screens
// can be ported one-to-one if needed.

export const colors = {
  bg:           '#000000',
  bgDeep:       '#000000',
  surface:      '#111113',
  surfaceLight: '#1A1A1E',
  border:       '#222226',
  borderLight:  '#1A1A1E',

  text:         '#FFFFFF',
  textMid:      '#C8C8D0',
  textMuted:    '#8E8E96',
  textFaint:    '#5A5A62',

  primary:      '#F6237D',
  primaryLight: '#F6237D15',
  primaryDark:  '#D11E6A',

  secondary:      '#4B6B8F',
  secondaryLight: '#4B6B8F15',

  good:         '#22C55E',
  goodLight:    '#22C55E15',
  caution:      '#F59E0B',
  cautionLight: '#F59E0B15',
  warn:         '#EF4444',
  warnLight:    '#EF444415',
};

export const fontFamily = {
  light:    'Poppins_300Light',
  regular:  'Poppins_400Regular',
  medium:   'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
};

export const text = {
  heading:    { fontSize: 18, fontWeight: '600', color: colors.text, fontFamily: fontFamily.semibold },
  subheading: { fontSize: 15, fontWeight: '600', color: colors.text, fontFamily: fontFamily.semibold },
  body:       { fontSize: 15, fontWeight: '400', color: colors.text, fontFamily: fontFamily.regular },
  bodyLight:  { fontSize: 15, fontWeight: '300', color: colors.textMid, fontFamily: fontFamily.light },
  small:      { fontSize: 13, fontWeight: '300', color: colors.textMid, fontFamily: fontFamily.light },
  label:      { fontSize: 10, fontWeight: '500', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: fontFamily.medium },
  caption:    { fontSize: 11, fontWeight: '300', color: colors.textMuted, fontFamily: fontFamily.light },
};

import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BOTTOM_INSET = Platform.OS === 'android' ? 48 : 0;
export const TOP_INSET = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

export function useBottomInset(extra = 0) {
  try {
    const insets = useSafeAreaInsets();
    const reported = insets?.bottom || 0;
    const effective = Platform.OS === 'android' ? Math.max(reported, BOTTOM_INSET) : reported;
    return effective + extra;
  } catch {
    return (Platform.OS === 'android' ? BOTTOM_INSET : 0) + extra;
  }
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const radius  = { sm: 8, md: 12, lg: 14, xl: 18, xxl: 22, pill: 999 };
export const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

export const layout = {
  pagePad:    20,
  cardRadius: 14,
  card: (extra = {}) => ({
    backgroundColor: colors.surface,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
    ...extra,
  }),
};
