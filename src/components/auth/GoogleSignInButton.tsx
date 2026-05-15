import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { COLORS, RADIUS, SPACING } from '../../constants';

GoogleSignin.configure({
  webClientId: '673067127577-ad5quav4fr7dkpc05enrf2muvo6mppsd.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
});

interface Props {
  onSuccess: (idToken: string) => Promise<void>;
  label?: string;
}

export default function GoogleSignInButton({ onSuccess, label = 'Google-ით გაგრძელება' }: Props) {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error('No ID token');
      await onSuccess(idToken);
    } catch (e: any) {
      if (e.code !== statusCodes.SIGN_IN_CANCELLED) {
        console.warn('Google sign-in error:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.btn, loading && styles.btnDisabled]}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#444" />
      ) : (
        <>
          <View style={styles.iconWrap}>
            <Text style={styles.gText}>G</Text>
          </View>
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 50,
  },
  btnDisabled: { opacity: 0.6 },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gText: { fontSize: 12, fontWeight: '900', color: '#fff' },
  label: { fontSize: 15, fontWeight: '700', color: '#111' },
});
