import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NavigationContainerRef, CommonActions } from '@react-navigation/native';
import Navigation from './src/navigation';
import { useAuthStore } from './src/store/authStore';
import { setAuthStateGetter } from './src/api/client';
import { registerForPushNotifications } from './src/services/notifications';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import OfflineBanner from './src/components/common/OfflineBanner';
import { RootStackParamList } from './src/types';

export const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

function AppInner() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    setAuthStateGetter(() => useAuthStore.getState());
    loadFromStorage();
    registerForPushNotifications().catch(() => {});

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (data?.bookingId) {
        navigationRef.current?.dispatch(CommonActions.navigate('Main', { screen: 'Bookings' }));
      }
    });

    return () => { responseListener.current?.remove(); };
  }, []);
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Navigation />
      <OfflineBanner />
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
