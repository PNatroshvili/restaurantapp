import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../../constants';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage { text: string; type: ToastType; id: number; }

let _show: ((text: string, type?: ToastType) => void) | null = null;

export function showToast(text: string, type: ToastType = 'success') {
  _show?.(text, type);
}

export default function ToastContainer() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    _show = (text, type = 'success') => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ text, type, id: Date.now() });
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
      timerRef.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setToast(null));
      }, 2800);
    };
    return () => { _show = null; if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  if (!toast) return null;

  const icon = toast.type === 'success' ? 'checkmark-circle' : toast.type === 'error' ? 'close-circle' : 'information-circle';
  const color = toast.type === 'success' ? COLORS.success : toast.type === 'error' ? COLORS.error : COLORS.primary;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: 90 },
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.toast, { borderLeftColor: color }]}>
        <Ionicons name={icon as any} size={20} color={color} />
        <Text style={styles.text}>{toast.text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: SPACING.md, right: SPACING.md, zIndex: 9999 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 13,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
    elevation: 12,
  },
  text: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
});
