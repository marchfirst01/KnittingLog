import { Platform } from 'react-native';

export const colors = {
  bg: '#F9F6F1',
  surface: '#FFFFFF',
  primary: '#C4704A',
  primaryDark: '#A95B38',
  primarySoft: '#FCEDE7',
  primaryMuted: '#E8B9A4',
  border: '#EAE3DA',
  borderStrong: '#DDD3C7',
  text: '#2B2522',
  textSub: '#8B7E74',
  textMuted: '#B3A89E',
  segmentBg: '#EFEAE3',
  chipBg: '#F4EFE9',
  danger: '#D0533F',
  overlay: 'rgba(43, 37, 34, 0.45)',
};

export const statusStyles = {
  active: { label: '진행중', bg: '#E6F6EE', fg: '#2E9E6A' },
  paused: { label: '보관', bg: '#FFF5DE', fg: '#C68A1E' },
  done: { label: '종료', bg: '#F0EDE9', fg: '#7D746C' },
} as const;

export const fonts = {
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
};

export const radius = { sm: 10, md: 16, lg: 20, pill: 999 };

export const shadow = Platform.select({
  ios: { shadowColor: '#6B4B38', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 1 },
  default: {},
});
