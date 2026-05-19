import React, { useEffect, useRef, useState } from 'react';
import { navigationRef } from '../../App';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, Animated, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore } from '../store/authStore';
import { COLORS } from '../constants';
import { RootStackParamList, MainTabParamList } from '../types';

import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import EmailVerifyScreen from '../screens/auth/EmailVerifyScreen';
import HomeScreen from '../screens/home/HomeScreen';
import MapScreen from '../screens/map/MapScreen';
import SearchScreen from '../screens/search/SearchScreen';
import BookingsScreen from '../screens/bookings/BookingsScreen';
import FavoritesScreen from '../screens/profile/FavoritesScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import RestaurantDetailScreen from '../screens/restaurant/RestaurantDetailScreen';
import BookingScreen from '../screens/booking/BookingScreen';
import ReviewCreateScreen from '../screens/restaurant/ReviewCreateScreen';
import ProfileEditScreen from '../screens/profile/ProfileEditScreen';
import PrivacyScreen from '../screens/legal/PrivacyScreen';
import TermsScreen from '../screens/legal/TermsScreen';
import AboutScreen from '../screens/about/AboutScreen';
import ManagerScreen from '../screens/manager/ManagerScreen';
import SubscriptionScreen from '../screens/manager/SubscriptionScreen';
import ManagerRestaurantInfoScreen from '../screens/manager/ManagerRestaurantInfoScreen';
import ManagerWorkingHoursScreen from '../screens/manager/ManagerWorkingHoursScreen';
import ManagerMenuScreen from '../screens/manager/ManagerMenuScreen';
import ManagerPhotosScreen from '../screens/manager/ManagerPhotosScreen';
import ManagerDiscountsScreen from '../screens/manager/ManagerDiscountsScreen';
import ManagerEventsScreen from '../screens/manager/ManagerEventsScreen';
import ChatScreen from '../screens/chat/ChatScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.surface,
    border: COLORS.border,
    text: COLORS.text,
    primary: COLORS.primary,
    notification: COLORS.primary,
  },
};

const TAB_CONFIG: { name: keyof MainTabParamList; label: string; icon: string; iconFocused: string }[] = [
  { name: 'Home', label: 'მთავარი', icon: 'home-outline', iconFocused: 'home' },
  { name: 'Map', label: 'ძებნა', icon: 'search-outline', iconFocused: 'search' },
  { name: 'Bookings', label: 'ჯავშნები', icon: 'calendar-outline', iconFocused: 'calendar' },
  { name: 'Favorites', label: 'ფავ.', icon: 'heart-outline', iconFocused: 'heart' },
  { name: 'Profile', label: 'პროფილი', icon: 'person-outline', iconFocused: 'person' },
];

function AnimatedTabButton({ focused, label, icon, iconFocused, onPress, onLongPress }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const pillOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const pillWidth = useRef(new Animated.Value(focused ? 64 : 40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(pillOpacity, { toValue: focused ? 1 : 0, useNativeDriver: false, speed: 18, bounciness: 0 }),
      Animated.spring(pillWidth, { toValue: focused ? 64 : 40, useNativeDriver: false, speed: 18, bounciness: 0 }),
    ]).start();
  }, [focused]);

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 80, bounciness: 0 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 5 }).start();

  const pillBg = pillOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,182,122,0)', 'rgba(0,182,122,0.18)'],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={tabStyles.btn}
    >
      <Animated.View style={{ alignItems: 'center', transform: [{ scale }] }}>
        {/* Pill indicator — grows wider when focused */}
        <Animated.View style={[tabStyles.pill, { backgroundColor: pillBg, width: pillWidth }]}>
          <Ionicons
            name={(focused ? iconFocused : icon) as any}
            size={22}
            color={focused ? COLORS.primary : COLORS.textSecondary}
          />
        </Animated.View>
        <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const tabStyles = StyleSheet.create({
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  pill: {
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  label: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  labelActive: { color: COLORS.primary, fontWeight: '800' },
});

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          elevation: 24,
          shadowColor: '#000',
          shadowOpacity: 0.5,
          shadowOffset: { width: 0, height: -3 },
          shadowRadius: 16,
        },
      }}
    >
      {TAB_CONFIG.map(({ name, label, icon, iconFocused }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={
            name === 'Home' ? HomeScreen :
            name === 'Map' ? MapScreen :
            name === 'Bookings' ? BookingsScreen :
            name === 'Favorites' ? FavoritesScreen :
            ProfileScreen
          }
          options={{
            tabBarButton: (props) => (
              <AnimatedTabButton
                {...props}
                label={label}
                icon={icon}
                iconFocused={iconFocused}
                focused={props.accessibilityState?.selected}
              />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { isLoading } = useAuthStore();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then(v => setOnboardingDone(v === 'true'));
  }, []);

  if (isLoading || onboardingDone === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator
        initialRouteName={onboardingDone ? 'Main' : 'Onboarding'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 320,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Main" component={MainTabs} options={{ animation: 'none' }} />
        <Stack.Screen
          name="RestaurantDetail"
          component={RestaurantDetailScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom', animationDuration: 380 }}
        />
        <Stack.Screen
          name="Booking"
          component={BookingScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom', animationDuration: 350 }}
        />
        <Stack.Screen
          name="ReviewCreate"
          component={ReviewCreateScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom', animationDuration: 350 }}
        />
        <Stack.Screen
          name="ProfileEdit"
          component={ProfileEditScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom', animationDuration: 350 }}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom', animationDuration: 350 }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom', animationDuration: 350 }}
        />
        <Stack.Screen
          name="EmailVerify"
          component={EmailVerifyScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom', animationDuration: 350 }}
        />
        <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Terms" component={TermsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Manager" component={ManagerScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ManagerRestaurantInfo" component={ManagerRestaurantInfoScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ManagerWorkingHours" component={ManagerWorkingHoursScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ManagerMenu" component={ManagerMenuScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ManagerPhotos" component={ManagerPhotosScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ManagerDiscounts" component={ManagerDiscountsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ManagerEvents" component={ManagerEventsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ animation: 'slide_from_right' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
