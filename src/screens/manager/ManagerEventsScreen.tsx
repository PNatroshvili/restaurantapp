import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Alert, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { eventsApi, RestaurantEvent } from '../../api/events';
import { COLORS, SPACING, RADIUS } from '../../constants';
import { RootStackParamList } from '../../types';

type RouteProps = RouteProp<RootStackParamList, 'ManagerEvents'>;

const EMOJI_OPTIONS = ['🎉', '🎵', '🍾', '🎸', '🥂', '🎭', '🍕', '🎨', '🏷️', '⭐'];

export default function ManagerEventsScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { restaurantId } = route.params;
  const [events, setEvents] = useState<RestaurantEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🎉');
  const [eventDate, setEventDate] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data } = await eventsApi.getForRestaurant(restaurantId);
      setEvents(data);
    } catch {}
    finally { setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const save = async () => {
    if (!title.trim()) { Alert.alert('', 'სათაური სავალდებულოა'); return; }
    setSaving(true);
    try {
      await eventsApi.create(restaurantId, { title: title.trim(), description: description.trim() || undefined, emoji, eventDate: eventDate.trim() || undefined });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
      setTitle(''); setDescription(''); setEmoji('🎉'); setEventDate('');
      load();
    } catch { Alert.alert('შეცდომა', 'შენახვა ვერ მოხერხდა'); }
    finally { setSaving(false); }
  };

  const remove = (id: string) => {
    Alert.alert('წაშლა', 'ნამდვილად გსურთ ღონისძიების წაშლა?', [
      { text: 'გაუქმება', style: 'cancel' },
      { text: 'წაშლა', style: 'destructive', onPress: async () => {
        try { await eventsApi.remove(id); setEvents(prev => prev.filter(e => e.id !== id)); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
        catch { Alert.alert('შეცდომა', 'წაშლა ვერ მოხერხდა'); }
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ღონისძიებები</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        keyExtractor={e => e.id}
        contentContainerStyle={{ padding: SPACING.md, gap: SPACING.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={{ fontSize: 48 }}>🎉</Text>
            <Text style={styles.emptyTitle}>ღონისძიება არ არის</Text>
            <Text style={styles.emptySub}>დაამატეთ სპეციალური შეთავაზება ან ღონისძიება</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
              <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.emptyBtnText}>ღონისძიების დამატება</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: e }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardEmoji}>{e.emoji || '🎉'}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.cardTitle}>{e.title}</Text>
              {e.description ? <Text style={styles.cardDesc} numberOfLines={2}>{e.description}</Text> : null}
              {e.eventDate ? (
                <View style={styles.dateBadge}>
                  <Ionicons name="calendar-outline" size={12} color={COLORS.primary} />
                  <Text style={styles.dateBadgeText}>{e.eventDate}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => remove(e.id)}>
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>ახალი ღონისძიება</Text>
            <TouchableOpacity onPress={save} disabled={saving}>
              <Text style={[styles.saveText, saving && { opacity: 0.5 }]}>{saving ? 'ინახება...' : 'შენახვა'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: SPACING.md, gap: SPACING.md }}>
            <Text style={styles.fieldLabel}>ემოჯი</Text>
            <View style={styles.emojiRow}>
              {EMOJI_OPTIONS.map(e => (
                <TouchableOpacity key={e} style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]} onPress={() => setEmoji(e)}>
                  <Text style={{ fontSize: 24 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>სათაური *</Text>
            <TextInput style={styles.input} placeholder="მაგ. ლაივ მუსიკა პარასკევს" value={title} onChangeText={setTitle} placeholderTextColor={COLORS.textMuted} />
            <Text style={styles.fieldLabel}>აღწერა</Text>
            <TextInput style={[styles.input, { height: 88 }]} placeholder="დამატებითი ინფორმაცია..." value={description} onChangeText={setDescription} multiline textAlignVertical="top" placeholderTextColor={COLORS.textMuted} />
            <Text style={styles.fieldLabel}>თარიღი (არასავალდებულო)</Text>
            <TextInput style={styles.input} placeholder="მაგ. 2026-05-20" value={eventDate} onChangeText={setEventDate} placeholderTextColor={COLORS.textMuted} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 10, marginTop: SPACING.sm },
  emptyBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },

  card: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  cardLeft: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 26 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: COLORS.primary + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  dateBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  deleteBtn: { padding: 6 },

  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  saveText: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  emojiBtn: { width: 52, height: 52, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  emojiBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '18' },
  input: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface },
});
