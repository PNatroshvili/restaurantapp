import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { COLORS, RADIUS, SPACING } from '../../constants';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import Button from '../../components/common/Button';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';

const DEMO_ACCOUNTS = [
  { label: 'სტუმარი', email: 'guest@restaurant.ge', password: 'guest123', icon: '👤' },
  { label: 'მფლობელი', email: 'owner@restaurant.ge', password: 'owner123', icon: '🏪' },
  { label: 'ადმინი', email: 'admin@restaurant.ge', password: 'admin123', icon: '🛡️' },
];

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const login = useAuthStore((s) => s.login);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (email?: string, pass?: string) => {
    const id = email ?? identifier;
    const pw = pass ?? password;
    if (!id || !pw) {
      Alert.alert('შეცდომა', 'შეავსეთ ყველა ველი');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.login({ identifier: id, password: pw });
      await login(data.tokens, data.user);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('შეცდომა', e?.response?.data?.message || 'შესვლა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setIdentifier(acc.email);
    setPassword(acc.password);
  };

  const handleGoogleLogin = async (idToken: string) => {
    try {
      const { data } = await authApi.googleLogin({ idToken });
      await login(data.tokens, data.user);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('შეცდომა', e?.response?.data?.message || 'Google-ით შესვლა ვერ მოხერხდა');
    }
  };

  return (
    <SafeAreaView style={styles.root}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.handle} />
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={24} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🍽️</Text>
        <Text style={styles.title}>შესვლა</Text>
        <Text style={styles.subtitle}>გააგრძელეთ სარესტორნო სამყაროს აღმოჩენა</Text>

        {/* Demo accounts */}
        <View style={styles.demoSection}>
          <Text style={styles.demoLabel}>სადემო ანგარიშები</Text>
          <View style={styles.demoRow}>
            {DEMO_ACCOUNTS.map((acc) => (
              <TouchableOpacity
                key={acc.email}
                style={styles.demoBtn}
                onPress={() => fillDemo(acc)}
                activeOpacity={0.75}
              >
                <Text style={styles.demoIcon}>{acc.icon}</Text>
                <Text style={styles.demoBtnLabel}>{acc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="ტელეფონი ან ელფოსტა"
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={COLORS.textMuted}
          />
          <TextInput
            style={styles.input}
            placeholder="პაროლი"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={COLORS.textMuted}
          />
          <Button label="შესვლა" onPress={() => handleLogin()} loading={loading} />
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ან</Text>
          <View style={styles.dividerLine} />
        </View>

        <GoogleSignInButton onSuccess={handleGoogleLogin} />

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: SPACING.md }}>
          <Text style={styles.link}>ანგარიში არ გაქვთ? <Text style={styles.linkBold}>რეგისტრაცია</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: SPACING.md },
  closeBtn: { position: 'absolute', top: SPACING.md, right: SPACING.md, zIndex: 10, padding: 8 },
  inner: { flexGrow: 1, padding: SPACING.lg, justifyContent: 'center' },
  logo: { fontSize: 56, textAlign: 'center', marginBottom: SPACING.lg },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: SPACING.xs },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.lg },
  demoSection: { marginBottom: SPACING.lg },
  demoLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center', marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  demoRow: { flexDirection: 'row', gap: SPACING.sm },
  demoBtn: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm, backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  demoIcon: { fontSize: 22 },
  demoBtnLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  form: { gap: SPACING.md, marginBottom: SPACING.lg },
  input: {
    height: 50, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface,
  },
  link: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 14 },
  linkBold: { color: COLORS.primary, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
});
