export const API_BASE_URL = 'https://api.skup.ge/v1';

export const COLORS = {
  primary: '#D35839',
  primaryDark: '#AD4028',
  primaryLight: '#F9E6DF',
  background: '#F7F5F1',
  surface: '#FFFFFF',
  surfaceElevated: '#F1EEE8',
  surfaceHigh: '#E8E3DB',
  border: '#E2DED6',
  borderLight: '#D6D1C8',
  text: '#171A18',
  textSecondary: '#6F746F',
  textMuted: '#9B9F9A',
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
  overlay: 'rgba(0,0,0,0.75)',
  mapMarker: '#D35839',
  score: '#D35839',
  scoreGood: '#2AA876',
  scoreMid: '#F59E0B',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
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
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
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
