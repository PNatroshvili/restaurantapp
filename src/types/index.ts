export type UserRole = 'user' | 'restaurant_manager' | 'admin';

export interface User {
  id: string;
  name: string;
  lastName?: string;
  phone?: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  status: 'active' | 'blocked';
  createdAt: string;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  district?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  discountPercent?: number;
  ratingAvg: number;
  reviewsCount?: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';
  distance?: number;
  isOpen?: boolean;
  coverPhoto?: string;
  cover_photo?: string; // returned by mapCoverPhoto in service
  photos?: RestaurantPhoto[];
  cuisine?: Cuisine;
  workingHours?: WorkingHour[];
}

export interface RestaurantPhoto {
  id: string;
  restaurantId: string;
  url: string;
  sortOrder: number;
  isCover: boolean;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  photoUrl?: string;
  isAvailable: boolean;
}

export interface Review {
  id: string;
  userId: string;
  restaurantId: string;
  rating: number;
  comment?: string;
  status: 'pending' | 'approved' | 'hidden';
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'avatar'>;
}

export interface Booking {
  id: string;
  userId: string;
  restaurantId: string;
  date: string;
  time: string;
  guestsCount: number;
  comment?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected';
  restaurant?: Pick<Restaurant, 'id' | 'name' | 'address' | 'cover_photo'>;
  user?: Pick<User, 'id' | 'name' | 'phone' | 'email'>;
}

export interface Cuisine {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface Favorite {
  id: string;
  userId: string;
  restaurantId: string;
}

export interface WorkingHour {
  day: number;
  open: string;
  close: string;
  isClosed: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export type RootStackParamList = {
  Onboarding: undefined;
  Main: { screen?: keyof MainTabParamList; params?: any } | undefined;
  RestaurantDetail: { id: string };
  Booking: { restaurantId: string; restaurantName: string };
  ReviewCreate: { restaurantId: string };
  ProfileEdit: undefined;
  Search: { cuisineId?: string; cuisineName?: string; dishQuery?: string } | undefined;
  Login: undefined;
  Register: undefined;
  EmailVerify: { email: string };
  Privacy: undefined;
  Terms: undefined;
  About: undefined;
  Manager: undefined;
  Subscription: undefined;
  ManagerRestaurantInfo: { restaurantId: string };
  ManagerWorkingHours: { restaurantId: string };
  ManagerMenu: { restaurantId: string };
  ManagerPhotos: { restaurantId: string };
  ManagerDiscounts: { restaurantId: string };
  ManagerEvents: { restaurantId: string };
  Chat: { bookingId: string; restaurantName: string };
};

export type MainTabParamList = {
  Home: undefined;
  Map: {
    cuisineId?: string;
    filterOpen?: boolean;
    filterRating?: 4 | 4.5;
    sortNearest?: boolean;
    userLat?: number;
    userLng?: number;
  } | undefined;
  Bookings: undefined;
  Favorites: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};
