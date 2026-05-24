export const API_BASE_URL = 'https://api.skup.ge/v1';

export const COLORS = {
  primary: '#00B67A',
  primaryDark: '#009962',
  primaryLight: '#00291C',
  background: '#0E0E10',
  surface: '#141417',
  surfaceElevated: '#1C1C20',
  surfaceHigh: '#222226',
  border: '#2C2C32',
  borderLight: '#38383F',
  text: '#F2F2F4',
  textSecondary: '#86868F',
  textMuted: '#4E4E58',
  white: '#FFFFFF',
  black: '#000000',
  success: '#00C896',
  warning: '#F59E0B',
  error: '#EF4444',
  star: '#FBBF24',
  accent: '#F59E0B',
  accentDeep: '#D97706',
  rose: '#F43F5E',
  indigo: '#818CF8',
  overlay: 'rgba(0,0,0,0.8)',
  mapMarker: '#00B67A',
  score: '#00C896',
  scoreGood: '#00D4A8',
  scoreMid: '#F59E0B',
};

export const FONTS = {
  regular:  'NotoSansGeorgian_400Regular',
  medium:   'NotoSansGeorgian_500Medium',
  semiBold: 'NotoSansGeorgian_600SemiBold',
  bold:     'NotoSansGeorgian_700Bold',
  extraBold:'NotoSansGeorgian_800ExtraBold',
  black:    'NotoSansGeorgian_900Black',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  full: 9999,
};

export const TBILISI_COORDS = {
  latitude: 41.6938,
  longitude: 44.8015,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export const DAYS_GE = ['კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];

export const BOOKING_STATUSES = {
  pending: 'მოლოდინში',
  confirmed: 'დადასტურებული',
  cancelled: 'გაუქმებული',
  rejected: 'უარყოფილი',
} as const;

export const PRICE_LEVELS = [
  { value: 1, label: '₾' },
  { value: 2, label: '₾₾' },
  { value: 3, label: '₾₾₾' },
  { value: 4, label: '₾₾₾₾' },
];
