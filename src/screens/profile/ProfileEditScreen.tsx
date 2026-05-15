import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING, RADIUS } from '../../constants';
import Button from '../../components/common/Button';
import { showToast } from '../../components/common/Toast';
import { RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileEditScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState(user?.name || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);

  const saveInfo = async () => {
    if (!name.trim()) { Alert.alert('', 'სახელი სავალდებულოა'); return; }
    if (!lastName.trim()) { Alert.alert('', 'გვარი სავალდებულოა'); return; }
    if (!phone.trim()) { Alert.alert('', 'ტელეფონი სავალდებულოა'); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('', 'სწორი ელფოსტა სავალდებულოა'); return;
    }
    setLoadingInfo(true);
    try {
      const { data } = await authApi.updateMe({ name: name.trim(), lastName: lastName.trim(), phone: phone.trim(), email: email.trim() });
      if (data.requiresVerification) {
        showToast('დადასტურების კოდი გაიგზავნა ახალ ელფოსტაზე');
        navigation.navigate('EmailVerify', { email: data.email });
      } else {
        useAuthStore.setState((s) => ({ user: { ...s.user!, ...data } }));
        showToast('პროფილი განახლდა');
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('შეცდომა', e?.response?.data?.message || 'განახლება ვერ მოხერხდა');
    } finally {
      setLoadingInfo(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword) { Alert.alert('', 'შეიყვანეთ მიმდინარე პაროლი'); return; }
    if (newPassword.length < 6) { Alert.alert('', 'ახალი პაროლი მინიმუმ 6 სიმბოლო'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('', 'პაროლები არ ემთხვევა'); return; }
    setLoadingPass(true);
    try {
      await authApi.updateMe({ currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      showToast('პაროლი შეიცვალა');
    } catch (e: any) {
      Alert.alert('შეცდომა', e?.response?.data?.message || 'პაროლის შეცვლა ვერ მოხერხდა');
    } finally {
      setLoadingPass(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>პროფილის რედაქტირება</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Personal info */}
          <Text style={styles.sectionTitle}>პირადი ინფორმაცია</Text>

          <Text style={styles.label}>სახელი</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="სახელი" placeholderTextColor={COLORS.textMuted} />

          <Text style={styles.label}>გვარი</Text>
          <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="გვარი" placeholderTextColor={COLORS.textMuted} />

          <Text style={styles.label}>ტელეფონი</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="ტელეფონი" placeholderTextColor={COLORS.textMuted} />

          <Text style={styles.label}>ელფოსტა</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="ელფოსტა" placeholderTextColor={COLORS.textMuted} />
          {email !== (user?.email || '') && (
            <Text style={styles.hint}>⚠️ ელფოსტის შეცვლა მოითხოვს დადასტურებას</Text>
          )}

          <Button label="შენახვა" onPress={saveInfo} loading={loadingInfo} style={{ marginTop: SPACING.lg }} />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Password change */}
          <Text style={styles.sectionTitle}>პაროლის შეცვლა</Text>

          <Text style={styles.label}>მიმდინარე პაროლი</Text>
          <View style={styles.passwordRow}>
            <TextInput style={[styles.input, { flex: 1 }]} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry={!showCurrent} placeholder="••••••" placeholderTextColor={COLORS.textMuted} />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCurrent(v => !v)}>
              <Ionicons name={showCurrent ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>ახალი პაროლი</Text>
          <View style={styles.passwordRow}>
            <TextInput style={[styles.input, { flex: 1 }]} value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showNew} placeholder="მინიმუმ 6 სიმბოლო" placeholderTextColor={COLORS.textMuted} />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(v => !v)}>
              <Ionicons name={showNew ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>გაიმეორეთ პაროლი</Text>
          <View style={styles.passwordRow}>
            <TextInput style={[styles.input, { flex: 1 }]} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirm} placeholder="••••••" placeholderTextColor={COLORS.textMuted} />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
              <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Button label="პაროლის შეცვლა" onPress={savePassword} loading={loadingPass} style={{ marginTop: SPACING.lg, marginBottom: SPACING.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  body: { padding: SPACING.md },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs, marginTop: SPACING.md },
  input: { height: 50, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface },
  hint: { fontSize: 12, color: COLORS.warning ?? '#F59E0B', marginTop: 4, marginLeft: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.xl },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { width: 50, height: 50, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
});
