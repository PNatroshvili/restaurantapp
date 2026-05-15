import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS } from '../../constants';
import { managerApi } from '../../api/restaurants';
import { RootStackParamList } from '../../types';

type Route = RouteProp<RootStackParamList, 'ManagerDiscounts'>;

const PRESETS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 50];

export default function ManagerDiscountsScreen() {
  const nav = useNavigation();
  const { params } = useRoute<Route>();
  const rid = params.restaurantId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState<number>(0);
  const [selected, setSelected] = useState<number>(0);

  useEffect(() => {
    managerApi.getMyRestaurant().then(res => {
      const pct = res.data.discountPercent || 0;
      setCurrent(pct);
      setSelected(pct);
    }).catch(() => {
      Alert.alert('შეცდომა', 'მონაცემები ვერ ჩაიტვირთა');
    }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await managerApi.updateDiscount(rid, selected);
      setCurrent(selected);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('', selected === 0 ? 'ფასდაკლება გაუქმდა' : `${selected}% ფასდაკლება დაყენდა`, [
        { text: 'OK', onPress: () => nav.goBack() },
      ]);
    } catch {
      Alert.alert('შეცდომა', 'შენახვა ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.root}><View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>ფასდაკლება</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Current status card */}
        <View style={styles.statusCard}>
          <View style={[styles.discountCircle, { borderColor: current > 0 ? COLORS.primary : COLORS.border }]}>
            <Text style={[styles.discountBig, { color: current > 0 ? COLORS.primary : COLORS.textMuted }]}>
              {current}%
            </Text>
            <Text style={styles.discountSub}>ახლა</Text>
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>
              {current === 0 ? 'ფასდაკლება არ არის' : `${current}% ფასდაკლება`}
            </Text>
            <Text style={styles.statusDesc}>
              {current === 0
                ? 'მომხმარებლებს სრული ფასი დაეარება'
                : `მომხმარებლები ${current}%-ს დაზოგავენ`}
            </Text>
          </View>
        </View>

        {/* Preset picker */}
        <Text style={styles.sectionLabel}>ფასდაკლების პროცენტის არჩევა</Text>
        <View style={styles.presetsGrid}>
          {PRESETS.map(p => (
            <TouchableOpacity
              key={p}
              style={[
                styles.preset,
                selected === p && styles.presetActive,
                p === 0 && styles.presetZero,
                selected === p && p === 0 && styles.presetZeroActive,
              ]}
              onPress={() => { Haptics.selectionAsync(); setSelected(p); }}
            >
              {p === 0
                ? <Ionicons name="ban-outline" size={18} color={selected === 0 ? COLORS.error : COLORS.textMuted} />
                : <Text style={[styles.presetText, selected === p && styles.presetTextActive]}>{p}%</Text>
              }
            </TouchableOpacity>
          ))}
        </View>

        {selected > 0 && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
            <Text style={styles.infoText}>
              ₾20-ის კერძი {selected}%-ის დამატებით ₾{(20 * (1 - selected / 100)).toFixed(2)}-ად გაიყიდება
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveText}>
                  {selected === 0 ? 'ფასდაკლების გაუქმება' : `${selected}% ფასდაკლების დაყენება`}
                </Text>
              </>
            )
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  content: { flex: 1, padding: SPACING.md, gap: SPACING.lg },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  discountCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, alignItems: 'center', justifyContent: 'center', gap: 2 },
  discountBig: { fontSize: 24, fontWeight: '900' },
  discountSub: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  statusInfo: { flex: 1, gap: 4 },
  statusTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  statusDesc: { fontSize: 12, color: COLORS.textSecondary },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  preset: { width: 64, height: 52, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  presetActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '18' },
  presetZero: { borderColor: COLORS.border },
  presetZeroActive: { borderColor: COLORS.error, backgroundColor: COLORS.error + '12' },
  presetText: { fontSize: 16, fontWeight: '800', color: COLORS.textSecondary },
  presetTextActive: { color: COLORS.primary },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: COLORS.primary + '12', borderRadius: RADIUS.md, padding: SPACING.md },
  infoText: { flex: 1, fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 16 },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
