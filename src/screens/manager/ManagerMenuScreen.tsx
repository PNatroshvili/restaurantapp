import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS } from '../../constants';
import { managerApi } from '../../api/restaurants';
import { MenuCategory, MenuItem, RootStackParamList } from '../../types';

type Route = RouteProp<RootStackParamList, 'ManagerMenu'>;

type ModalMode = 'addCat' | 'editCat' | 'addItem' | 'editItem' | null;

interface ModalState {
  mode: ModalMode;
  catId?: string;
  catName?: string;
  item?: MenuItem;
}

export default function ManagerMenuScreen() {
  const nav = useNavigation();
  const { params } = useRoute<Route>();
  const rid = params.restaurantId;

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ mode: null });

  // form fields
  const [fName, setFName] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fPrice, setFPrice] = useState('');
  const [fAvail, setFAvail] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const res = await managerApi.getMyRestaurant();
      setCategories(res.data.menuCategories || []);
    } catch {
      Alert.alert('შეცდომა', 'მენიუ ვერ ჩაიტვირთა');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openModal = (state: ModalState) => {
    const item = state.item;
    setFName(state.catName || item?.name || '');
    setFDesc(item?.description || '');
    setFPrice(item ? String(item.price) : '');
    setFAvail(item ? item.isAvailable : true);
    setModal(state);
    Haptics.selectionAsync();
  };

  const closeModal = () => setModal({ mode: null });

  const submit = async () => {
    if (!fName.trim()) { Alert.alert('', 'სახელი სავალდებულოა'); return; }
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { mode, catId, item } = modal;
      if (mode === 'addCat') {
        await managerApi.addCategory(rid, fName);
      } else if (mode === 'editCat' && catId) {
        await managerApi.updateCategory(rid, catId, fName);
      } else if (mode === 'addItem' && catId) {
        if (!fPrice || isNaN(+fPrice)) { Alert.alert('', 'ფასი სწორად შეიყვანეთ'); return; }
        await managerApi.addItem(rid, catId, { name: fName, description: fDesc, price: +fPrice, isAvailable: fAvail });
      } else if (mode === 'editItem' && item) {
        if (!fPrice || isNaN(+fPrice)) { Alert.alert('', 'ფასი სწორად შეიყვანეთ'); return; }
        await managerApi.updateItem(rid, item.id, { name: fName, description: fDesc, price: +fPrice, isAvailable: fAvail });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
      load();
    } catch {
      Alert.alert('შეცდომა', 'ოპერაცია ვერ შესრულდა');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteCat = (catId: string, name: string) => {
    Alert.alert('კატეგორიის წაშლა', `"${name}" და ყველა კერძი წაიშლება. გასაგრძელებლად დაადასტურეთ.`, [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: 'წაშლა', style: 'destructive', onPress: async () => {
          try {
            await managerApi.deleteCategory(rid, catId);
            load();
          } catch { Alert.alert('შეცდომა', 'წაშლა ვერ მოხერხდა'); }
        },
      },
    ]);
  };

  const deleteItem = (itemId: string, name: string) => {
    Alert.alert('კერძის წაშლა', `"${name}" წაიშლება?`, [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: 'წაშლა', style: 'destructive', onPress: async () => {
          try {
            await managerApi.deleteItem(rid, itemId);
            load();
          } catch { Alert.alert('შეცდომა', 'წაშლა ვერ მოხერხდა'); }
        },
      },
    ]);
  };

  const isItemMode = modal.mode === 'addItem' || modal.mode === 'editItem';

  if (loading) {
    return <SafeAreaView style={styles.root}><View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>მენიუ</Text>
        <TouchableOpacity style={styles.addCatBtn} onPress={() => openModal({ mode: 'addCat' })}>
          <Ionicons name="add" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {categories.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="restaurant-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>მენიუ ცარიელია</Text>
            <Text style={styles.emptySub}>დაამატეთ პირველი კატეგორია</Text>
            <TouchableOpacity style={styles.addFirstBtn} onPress={() => openModal({ mode: 'addCat' })}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.addFirstText}>კატეგორიის დამატება</Text>
            </TouchableOpacity>
          </View>
        )}

        {categories.map(cat => (
          <View key={cat.id} style={styles.catCard}>
            <TouchableOpacity
              style={styles.catHeader}
              onPress={() => setExpanded(expanded === cat.id ? null : cat.id)}
            >
              <View style={styles.catLeft}>
                <Ionicons
                  name={expanded === cat.id ? 'chevron-down' : 'chevron-forward'}
                  size={18} color={COLORS.primary}
                />
                <Text style={styles.catName}>{cat.name}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{cat.items?.length || 0}</Text>
                </View>
              </View>
              <View style={styles.catActions}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => openModal({ mode: 'editCat', catId: cat.id, catName: cat.name })}
                >
                  <Ionicons name="pencil-outline" size={17} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => deleteCat(cat.id, cat.name)}>
                  <Ionicons name="trash-outline" size={17} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {expanded === cat.id && (
              <View style={styles.itemsWrap}>
                {(cat.items || []).map(item => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.description ? <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text> : null}
                      <View style={styles.itemMeta}>
                        <Text style={styles.itemPrice}>₾{Number(item.price).toFixed(2)}</Text>
                        <View style={[styles.availBadge, { backgroundColor: item.isAvailable ? COLORS.success + '22' : COLORS.error + '22' }]}>
                          <Text style={[styles.availText, { color: item.isAvailable ? COLORS.success : COLORS.error }]}>
                            {item.isAvailable ? 'ხელმისაწვდომი' : 'არ არის'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.itemActions}>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => openModal({ mode: 'editItem', catId: cat.id, item })}>
                        <Ionicons name="pencil-outline" size={16} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => deleteItem(item.id, item.name)}>
                        <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addItemBtn}
                  onPress={() => openModal({ mode: 'addItem', catId: cat.id })}
                >
                  <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.addItemText}>კერძის დამატება</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal */}
      <Modal visible={modal.mode !== null} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modal.mode === 'addCat' ? 'კატეგორიის დამატება'
                  : modal.mode === 'editCat' ? 'კატეგორიის რედაქტირება'
                  : modal.mode === 'addItem' ? 'კერძის დამატება'
                  : 'კერძის რედაქტირება'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalContent}>
                <View style={styles.mField}>
                  <Text style={styles.mLabel}>სახელი</Text>
                  <TextInput
                    style={styles.mInput}
                    value={fName}
                    onChangeText={setFName}
                    placeholder={isItemMode ? 'კერძის სახელი' : 'კატეგორიის სახელი'}
                    placeholderTextColor={COLORS.textMuted}
                    autoFocus
                  />
                </View>

                {isItemMode && (
                  <>
                    <View style={styles.mField}>
                      <Text style={styles.mLabel}>აღწერა (სურვილისამებრ)</Text>
                      <TextInput
                        style={[styles.mInput, { minHeight: 72, textAlignVertical: 'top' }]}
                        value={fDesc}
                        onChangeText={setFDesc}
                        placeholder="კერძის შესახებ..."
                        placeholderTextColor={COLORS.textMuted}
                        multiline
                      />
                    </View>
                    <View style={styles.mField}>
                      <Text style={styles.mLabel}>ფასი (₾)</Text>
                      <TextInput
                        style={styles.mInput}
                        value={fPrice}
                        onChangeText={setFPrice}
                        placeholder="0.00"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.availToggle}
                      onPress={() => { Haptics.selectionAsync(); setFAvail(v => !v); }}
                    >
                      <View style={[styles.availDot, { backgroundColor: fAvail ? COLORS.success : COLORS.error }]} />
                      <Text style={styles.availToggleText}>{fAvail ? 'ხელმისაწვდომია' : 'მიუწვდომელია'}</Text>
                      <Ionicons name={fAvail ? 'toggle' : 'toggle-outline'} size={28} color={fAvail ? COLORS.success : COLORS.textMuted} />
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={[styles.mSaveBtn, submitting && { opacity: 0.6 }]}
                  onPress={submit}
                  disabled={submitting}
                >
                  {submitting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.mSaveText}>შენახვა</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  addCatBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary + '18', borderRadius: 20 },
  content: { padding: SPACING.md, gap: SPACING.sm },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: SPACING.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textSecondary },
  addFirstBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  addFirstText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  catCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  catHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: 14 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  catName: { fontSize: 15, fontWeight: '800', color: COLORS.text, flex: 1 },
  countBadge: { backgroundColor: COLORS.primary + '22', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  countText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  catActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  itemsWrap: { borderTopWidth: 1, borderTopColor: COLORS.border },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: SPACING.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border + '88', gap: SPACING.sm },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  itemDesc: { fontSize: 12, color: COLORS.textSecondary },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  itemPrice: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  availBadge: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  availText: { fontSize: 10, fontWeight: '700' },
  itemActions: { flexDirection: 'row', gap: 2, paddingTop: 2 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: SPACING.md },
  addItemText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  // modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  modalContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  mField: { gap: 6 },
  mLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  mInput: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  availToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: 12 },
  availDot: { width: 10, height: 10, borderRadius: 5 },
  availToggleText: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },
  mSaveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center' },
  mSaveText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
