import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING, RADIUS } from '../../constants';
import Button from '../../components/common/Button';

export default function ProfileEditScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name.trim()) { Alert.alert('', 'სახელი სავალდებულოა'); return; }
    setLoading(true);
    try {
      const { data } = await authApi.updateMe({ name: name.trim(), phone: phone.trim() || undefined });
      useAuthStore.setState((s) => ({ user: { ...s.user!, ...data } }));
      navigation.goBack();
    } catch {
      Alert.alert('შეცდომა', 'განახლება ვერ მოხერხდა');
    } finally {
      setLoading(false);
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
        <View style={styles.body}>
          <Text style={styles.label}>სახელი</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor={COLORS.textMuted}
            placeholder="სახელი"
          />
          <Text style={styles.label}>ტელეფონი</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={COLORS.textMuted}
            placeholder="ტელეფონი"
          />
          <Button label="შენახვა" onPress={save} loading={loading} style={{ marginTop: SPACING.lg }} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  body: { padding: SPACING.md },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs, marginTop: SPACING.md },
  input: { height: 50, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface },
});
