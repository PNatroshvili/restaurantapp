import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import * as Network from 'expo-network';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;

  const show = (offline: boolean) => {
    setIsOffline(offline);
    if (offline) setWasOffline(true);
    Animated.spring(slideAnim, {
      toValue: offline ? 0 : -60,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start(() => {
      if (!offline && wasOffline) setWasOffline(false);
    });
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        const offline = !state.isConnected || !state.isInternetReachable;
        show(offline);
      } catch {}
    };

    check();
    interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!isOffline && !wasOffline) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }, !isOffline && styles.bannerBack]}>
      <Ionicons name={isOffline ? 'cloud-offline-outline' : 'cloud-done-outline'} size={16} color="#fff" />
      <Text style={styles.text}>
        {isOffline ? 'ინტერნეტი მიუწვდომელია' : 'კავშირი აღდგა'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10, paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.error,
  },
  bannerBack: { backgroundColor: COLORS.success },
  text: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
