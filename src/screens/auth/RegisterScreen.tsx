import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { COLORS, RADIUS, SPACING } from '../../constants';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import Button from '../../components/common/Button';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';

export default function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const login = useAuthStore((s) => s.login);
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (val: string) => {
    if (!val.trim()) { setEmailError('ელფოსტა სავალდებულოა'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { setEmailError('არასწორი ელფოსტის ფორმატი'); return false; }
    setEmailError(''); return true;
  };

  const validatePassword = (val: string) => {
    if (!val) { setPasswordError(''); return; }
    if (val.length < 6) setPasswordError('პაროლი მინიმუმ 6 სიმბოლო');
    else setPasswordError('');
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

  const handleRegister = async () => {
    if (!name.trim() || !lastName.trim() || !phone.trim() || !email.trim() || !password) {
      Alert.alert('შეცდომა', 'ყველა ველი სავალდებულოა');
      return;
    }
    if (!validateEmail(email)) return;
    if (passwordError) return;
    setLoading(true);
    try {
      const { data } = await authApi.register({ name, lastName, phone, email, password });
      if ((data as any).requiresVerification) {
        navigation.navigate('EmailVerify', { email: (data as any).email });
      } else {
        await login((data as any).tokens, (data as any).user);
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('შეცდომა', e?.response?.data?.message || 'რეგისტრაცია ვერ მოხერხდა');
    } finally {
      setLoading(false);
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
        <Text style={styles.title}>რეგისტრაცია</Text>
        <Text style={styles.subtitle}>შექმენით ანგარიში</Text>

        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="სახელი" value={name} onChangeText={setName} placeholderTextColor={COLORS.textMuted} />
          <TextInput style={styles.input} placeholder="გვარი" value={lastName} onChangeText={setLastName} placeholderTextColor={COLORS.textMuted} />
          <TextInput style={styles.input} placeholder="ტელეფონი" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={COLORS.textMuted} />
          <View>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="ელფოსტა"
              value={email}
              onChangeText={(v) => { setEmail(v); if (emailError) validateEmail(v); }}
              onBlur={() => email && validateEmail(email)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.textMuted}
            />
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
          </View>
          <View>
            <TextInput
              style={[styles.input, passwordError ? styles.inputError : null]}
              placeholder="პაროლი"
              value={password}
              onChangeText={(v) => { setPassword(v); if (passwordError) validatePassword(v); }}
              onBlur={() => validatePassword(password)}
              secureTextEntry
              placeholderTextColor={COLORS.textMuted}
            />
            {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
          </View>
          <Button label="რეგისტრაცია" onPress={handleRegister} loading={loading} />
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ან</Text>
          <View style={styles.dividerLine} />
        </View>

        <GoogleSignInButton onSuccess={handleGoogleLogin} label="Google-ით რეგისტრაცია" />

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: SPACING.md }}>
          <Text style={styles.link}>უკვე გაქვთ ანგარიში? <Text style={styles.linkBold}>შესვლა</Text></Text>
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
  inner: { flexGrow: 1, padding: SPACING.lg, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  form: { gap: SPACING.md, marginBottom: SPACING.lg },
  input: {
    height: 50, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface,
  },
  inputError: { borderColor: COLORS.error },
  fieldError: { fontSize: 12, color: COLORS.error, fontWeight: '600', marginTop: 4, marginLeft: 4 },
  link: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 14 },
  linkBold: { color: COLORS.primary, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
});
