export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/v1'
  : 'https://restaurant-backend-bm4s.onrender.com/v1';

export const COLORS = {
  primary: '#00B67A',
  primaryDark: '#009962',
  primaryLight: '#00291C',
  background: '#0A0E1A',
  surface: '#111929',
  surfaceElevated: '#16213A',
  border: '#1E2D3D',
  text: '#F0F4FF',
  textSecondary: '#8A9BBE',
  textMuted: '#4A5A7A',
  white: '#FFFFFF',
  black: '#000000',
  success: '#00C896',
  warning: '#F59E0B',
  error: '#EF4444',
  star: '#FBBF24',
  overlay: 'rgba(0,0,0,0.75)',
  mapMarker: '#00B67A',
  score: '#00C896',
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
