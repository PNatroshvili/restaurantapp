import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS } from '../../constants';
import { managerApi } from '../../api/restaurants';
import { RootStackParamList } from '../../types';

type Route = RouteProp<RootStackParamList, 'ManagerRestaurantInfo'>;

function Field({ label, value, onChangeText, placeholder, multiline }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor={COLORS.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

export default function ManagerRestaurantInfoScreen() {
  const nav = useNavigation();
  const { params } = useRoute<Route>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    managerApi.getMyRestaurant().then(res => {
      const r = res.data;
      setName(r.name || '');
      setDescription(r.description || '');
      setAddress(r.address || '');
      setCity(r.city || '');
      setDistrict(r.district || '');
      setPhone(r.phone || '');
    }).catch(() => {
      Alert.alert('შეცდომა', 'მონაცემები ვერ ჩაიტვირთა');
    }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!name.trim()) { Alert.alert('', 'სახელი სავალდებულოა'); return; }
    if (!address.trim()) { Alert.alert('', 'მისამართი სავალდებულოა'); return; }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await managerApi.updateInfo(params.restaurantId, { name, description, address, city, district, phone });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('', 'ინფორმაცია განახლდა', [{ text: 'OK', onPress: () => nav.goBack() }]);
    } catch {
      Alert.alert('შეცდომა', 'შენახვა ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>ინფორმაცია</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Field label="სახელი" value={name} onChangeText={setName} placeholder="რესტორნის სახელი" />
          <Field label="აღწერა" value={description} onChangeText={setDescription} placeholder="რესტორნის შესახებ..." multiline />
          <Field label="მისამართი" value={address} onChangeText={setAddress} placeholder="ქუჩა, N" />
          <Field label="ქალაქი" value={city} onChangeText={setCity} placeholder="თბილისი" />
          <Field label="უბანი" value={district} onChangeText={setDistrict} placeholder="ვაკე, საბურთალო..." />
          <Field label="ტელეფონი" value={phone} onChangeText={setPhone} placeholder="+995 5XX XX XX XX" />

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={save}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.saveText}>შენახვა</Text></>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  inputMulti: { minHeight: 100, paddingTop: 12 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 16, marginTop: SPACING.sm },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
