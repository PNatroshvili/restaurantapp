'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { COLORS, RADIUS, SPACING } from '../../constants';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'EmailVerify'>;

const CODE_LENGTH = 6;

export default function EmailVerifyScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { email } = route.params;
  const loginStore = useAuthStore((s) => s.login);

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);

  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleDigit = (val: string, idx: number) => {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = cleaned;
    setDigits(next);
    setError('');
    if (cleaned && idx < CODE_LENGTH - 1) inputs.current[idx + 1]?.focus();
    if (!cleaned && idx > 0) inputs.current[idx - 1]?.focus();
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const code = digits.join('');

  const verify = async () => {
    if (code.length < CODE_LENGTH) { setError('შეიყვანეთ 6-ნიშნა კოდი'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await authApi.verifyEmail({ email, code });
      await loginStore(data.tokens, data.user);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'არასწორი კოდი');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (countdown > 0) return;
    setResending(true); setError('');
    try {
      await authApi.resendCode(email);
      setCountdown(60);
      setDigits(Array(CODE_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } catch {
      Alert.alert('შეცდომა', 'კოდის გაგზავნა ვერ მოხერხდა');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.handle} />
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.inner}>
          <View style={styles.iconWrap}>
            <Text style={styles.iconEmoji}>✉️</Text>
          </View>
          <Text style={styles.title}>ელფოსტის დადასტურება</Text>
          <Text style={styles.subtitle}>კოდი გაიგზავნა{'\n'}<Text style={styles.email}>{email}</Text></Text>

          <View style={styles.codeRow}>
            {Array(CODE_LENGTH).fill(0).map((_, i) => (
              <TextInput
                key={i}
                ref={r => { inputs.current[i] = r; }}
                style={[styles.digitInput, digits[i] ? styles.digitFilled : null, error ? styles.digitError : null]}
                value={digits[i]}
                onChangeText={v => handleDigit(v, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
                autoFocus={i === 0}
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.verifyBtn, (loading || code.length < CODE_LENGTH) && styles.verifyBtnDisabled]}
            onPress={verify}
            disabled={loading || code.length < CODE_LENGTH}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.verifyBtnText}>დადასტურება</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={resend} disabled={countdown > 0 || resending} style={styles.resendBtn}>
            <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
              {resending ? 'იგზავნება...' : countdown > 0 ? `კოდის ხელახლა გაგზავნა (${countdown}წ)` : 'კოდის ხელახლა გაგზავნა'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: SPACING.md },
  closeBtn: { position: 'absolute', top: SPACING.md, right: SPACING.md, zIndex: 10, padding: 8 },
  inner: { flex: 1, padding: SPACING.lg, paddingTop: 48, alignItems: 'center' },
  iconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg, borderWidth: 1.5, borderColor: COLORS.border },
  iconEmoji: { fontSize: 36 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 22 },
  email: { color: COLORS.primary, fontWeight: '700' },
  codeRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.md },
  digitInput: {
    width: 46, height: 58, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, fontSize: 24, fontWeight: '800', color: COLORS.text,
  },
  digitFilled: { borderColor: COLORS.primary },
  digitError: { borderColor: COLORS.error },
  errorText: { color: COLORS.error, fontSize: 13, fontWeight: '600', marginBottom: SPACING.sm },
  verifyBtn: {
    width: '100%', height: 52, backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    justifyContent: 'center', alignItems: 'center', marginTop: SPACING.md,
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  resendBtn: { marginTop: SPACING.lg, padding: 8 },
  resendText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  resendDisabled: { color: COLORS.textMuted },
});
