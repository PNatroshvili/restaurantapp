import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS } from '../../constants';
import { managerApi } from '../../api/restaurants';
import { WorkingHour, RootStackParamList } from '../../types';

type Route = RouteProp<RootStackParamList, 'ManagerWorkingHours'>;

const DAY_NAMES = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];

const DEFAULT_HOURS: WorkingHour[] = [0, 1, 2, 3, 4, 5, 6].map(day => ({
  day,
  open: '10:00',
  close: '23:00',
  isClosed: day === 0,
}));

const TIMES: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of ['00', '30']) {
    TIMES.push(`${String(h).padStart(2, '0')}:${m}`);
  }
}

function TimeSelector({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity style={styles.timeBtn} onPress={() => setOpen(o => !o)}>
        <Text style={styles.timeText}>{value}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.textSecondary} />
      </TouchableOpacity>
      {open && (
        <View style={styles.timePicker}>
          <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
            {TIMES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.timeOption, t === value && styles.timeOptionActive]}
                onPress={() => { onChange(t); setOpen(false); }}
              >
                <Text style={[styles.timeOptionText, t === value && styles.timeOptionTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function ManagerWorkingHoursScreen() {
  const nav = useNavigation();
  const { params } = useRoute<Route>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<WorkingHour[]>(DEFAULT_HOURS);

  useEffect(() => {
    managerApi.getMyRestaurant().then(res => {
      const wh = res.data.workingHours;
      if (wh && wh.length === 7) {
        setHours([...wh].sort((a, b) => a.day - b.day));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const update = (day: number, patch: Partial<WorkingHour>) => {
    setHours(prev => prev.map(h => h.day === day ? { ...h, ...patch } : h));
  };

  const save = async () => {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await managerApi.updateWorkingHours(params.restaurantId, hours);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('', 'სამუშაო საათები განახლდა', [{ text: 'OK', onPress: () => nav.goBack() }]);
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>სამუშაო საათები</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {hours.map(h => (
          <View key={h.day} style={[styles.dayCard, h.isClosed && styles.dayCardClosed]}>
            <View style={styles.dayRow}>
              <Text style={[styles.dayName, h.isClosed && styles.dayNameClosed]}>{DAY_NAMES[h.day]}</Text>
              <View style={styles.closedRow}>
                <Text style={styles.closedLabel}>{h.isClosed ? 'დახურულია' : 'ღიაა'}</Text>
                <Switch
                  value={!h.isClosed}
                  onValueChange={v => { Haptics.selectionAsync(); update(h.day, { isClosed: !v }); }}
                  trackColor={{ false: COLORS.border, true: COLORS.primary + '66' }}
                  thumbColor={h.isClosed ? COLORS.textMuted : COLORS.primary}
                />
              </View>
            </View>
            {!h.isClosed && (
              <View style={styles.timesRow}>
                <View style={styles.timeGroup}>
                  <Text style={styles.timeLabel}>გახსნა</Text>
                  <TimeSelector value={h.open || '10:00'} onChange={v => update(h.day, { open: v })} />
                </View>
                <Ionicons name="arrow-forward" size={16} color={COLORS.textMuted} style={{ marginTop: 28 }} />
                <View style={styles.timeGroup}>
                  <Text style={styles.timeLabel}>დახურვა</Text>
                  <TimeSelector value={h.close || '23:00'} onChange={v => update(h.day, { close: v })} />
                </View>
              </View>
            )}
          </View>
        ))}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  content: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: 40 },
  dayCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm },
  dayCardClosed: { opacity: 0.6 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  dayNameClosed: { color: COLORS.textMuted },
  closedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closedLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  timesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  timeGroup: { flex: 1, gap: 4 },
  timeLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  timeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10 },
  timeText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  timePicker: { position: 'absolute', top: 44, left: 0, right: 0, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, zIndex: 99, elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  timeOption: { paddingHorizontal: 14, paddingVertical: 10 },
  timeOptionActive: { backgroundColor: COLORS.primary + '22' },
  timeOptionText: { fontSize: 14, color: COLORS.text },
  timeOptionTextActive: { fontWeight: '800', color: COLORS.primary },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 16, marginTop: SPACING.sm },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
