import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import {
  NotoSansGeorgian_400Regular,
  NotoSansGeorgian_500Medium,
  NotoSansGeorgian_600SemiBold,
  NotoSansGeorgian_700Bold,
  NotoSansGeorgian_800ExtraBold,
  NotoSansGeorgian_900Black,
} from '@expo-google-fonts/noto-sans-georgian';
import * as Notifications from 'expo-notifications';
import { NavigationContainerRef, CommonActions } from '@react-navigation/native';
import Navigation from './src/navigation';
import { useAuthStore } from './src/store/authStore';
import { setAuthStateGetter } from './src/api/client';
import { registerForPushNotifications } from './src/services/notifications';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import OfflineBanner from './src/components/common/OfflineBanner';
import ToastContainer from './src/components/common/Toast';
import { RootStackParamList } from './src/types';

export const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

function AppInner() {
  const [fontsLoaded] = useFonts({
    NotoSansGeorgian_400Regular,
    NotoSansGeorgian_500Medium,
    NotoSansGeorgian_600SemiBold,
    NotoSansGeorgian_700Bold,
    NotoSansGeorgian_800ExtraBold,
    NotoSansGeorgian_900Black,
  });

  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const responseListener = useRef<Notifications.EventSubscription>();

  // Boot: load persisted auth tokens first
  useEffect(() => {
    setAuthStateGetter(() => useAuthStore.getState());
    loadFromStorage();

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (data?.bookingId) {
        navigationRef.current?.dispatch(CommonActions.navigate('Main', { screen: 'Bookings' }));
      }
    });

    return () => { responseListener.current?.remove(); };
  }, []);

  // Register push token only after user is authenticated (covers both
  // returning users and fresh logins — runs whenever isAuthenticated flips to true)
  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications().catch(() => {});
    }
  }, [isAuthenticated]);
  if (!fontsLoaded) return null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Navigation />
      <OfflineBanner />
      <ToastContainer />
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <AppInner />
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
