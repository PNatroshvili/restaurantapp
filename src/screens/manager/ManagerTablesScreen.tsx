import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, RefreshControl, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { managerApi } from '../../api/restaurants';
import { COLORS, RADIUS, SPACING } from '../../constants';
import { RestaurantTable, RootStackParamList } from '../../types';
import { showToast } from '../../components/common/Toast';

type RouteProps = RouteProp<RootStackParamList, 'ManagerTables'>;

export default function ManagerTablesScreen() {
  const navigation = useNavigation();
  const { restaurantId } = useRoute<RouteProps>().params;
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', capacity: '2', shape: 'square' as RestaurantTable['shape'], zone: '' });

  const load = useCallback(async (refresh = false) => {
    if (!refresh) setLoading(true);
    try {
      const res = await managerApi.getTables(restaurantId);
      setTables(res.data || []);
    } catch {
      showToast('მაგიდების ჩატვირთვა ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = async () => {
    const name = form.name.trim();
    const capacity = Number(form.capacity);
    if (!name) { showToast('მაგიდის სახელი აუცილებელია', 'error'); return; }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 30) { showToast('ადგილების რაოდენობა უნდა იყოს 1-30', 'error'); return; }
    setSaving(true);
    try {
      const res = await managerApi.createTable(restaurantId, {
        name,
        capacity,
        shape: form.shape,
        zone: form.zone.trim() || null,
        isActive: true,
      });
      setTables(prev => [...prev, res.data]);
      setForm({ name: '', capacity: '2', shape: 'square', zone: '' });
      showToast('მაგიდა დაემატა');
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'მაგიდა ვერ შეიქმნა', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = (table: RestaurantTable) => {
    Alert.alert('მაგიდის წაშლა', table.name + '-ის წაშლა?', [
      { text: 'არა', style: 'cancel' },
      { text: 'წაშლა', style: 'destructive', onPress: async () => {
        try {
          await managerApi.deleteTable(table.id);
          setTables(prev => prev.filter(t => t.id !== table.id));
        } catch {
          showToast('მაგიდა ვერ წაიშალა', 'error');
        }
      }},
    ]);
  };

  return <SafeAreaView style={styles.root} edges={['top']}>
    <View style={styles.header}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={21} color={COLORS.text} /></TouchableOpacity>
      <View style={{ flex: 1 }}><Text style={styles.title}>მაგიდები</Text><Text style={styles.subtitle}>ტევადობა და დაჯავშნის განაწილება</Text></View>
    </View>

    <View style={styles.form}>
      <Text style={styles.formTitle}>ახალი მაგიდა</Text>
      <TextInput style={styles.input} value={form.name} onChangeText={v => setForm({ ...form, name: v })} placeholder="მაგ. T1" placeholderTextColor={COLORS.textMuted} />
      <TextInput style={styles.input} value={form.capacity} onChangeText={v => setForm({ ...form, capacity: v.replace(/\D/g, '').slice(0, 2) })} placeholder="ადგილები" keyboardType="number-pad" placeholderTextColor={COLORS.textMuted} />
      <View style={styles.shapeRow}>{(['square','round','rectangle'] as const).map(shape => <TouchableOpacity key={shape} onPress={() => setForm({ ...form, shape })} style={[styles.shapeBtn, form.shape === shape && styles.shapeActive]}><Text style={[styles.shapeText, form.shape === shape && styles.shapeTextActive]}>{shape === 'square' ? 'კვად.' : shape === 'round' ? 'მრგ.' : 'მართკ.'}</Text></TouchableOpacity>)}</View>
      <TextInput style={styles.input} value={form.zone} onChangeText={v => setForm({ ...form, zone: v })} placeholder="ზონა / ვერანდა" placeholderTextColor={COLORS.textMuted} />
      <TouchableOpacity style={[styles.createBtn, saving && { opacity: .5 }]} onPress={create} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="add" size={18} color="#fff" /><Text style={styles.createText}>დამატება</Text></>}</TouchableOpacity>
    </View>

    <FlatList
      data={tables}
      keyExtractor={t => t.id}
      contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      ListEmptyComponent={!loading ? <View style={styles.empty}><Ionicons name="grid-outline" size={42} color={COLORS.textMuted}/><Text style={styles.emptyTitle}>მაგიდები ჯერ არ არის</Text><Text style={styles.emptySub}>დაამატე მაგიდები, რათა LUKMA-მ დაჯავშნისას ტევადობა გაითვალისწინოს.</Text></View> : null}
      renderItem={({ item }) => <View style={[styles.row, !item.isActive && { opacity: .55 }]}>
        <View style={[styles.tableVisual, item.shape === 'round' && styles.round, item.shape === 'rectangle' && styles.rectangle]}><Text style={styles.tableName}>{item.name}</Text><Text style={styles.tableCapacity}>{item.capacity}</Text></View>
        <View style={styles.copy}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.rowMeta}>{item.capacity} ადგილი{item.zone ? ' · ' + item.zone : ''}</Text><Text style={styles.status}>{item.isActive ? 'აქტიური' : 'გამორთული'}</Text></View>
        <Switch
          value={item.isActive}
          onValueChange={async (value) => {
            try {
              const res = await managerApi.updateTable(item.id, { isActive: value });
              setTables(prev => prev.map(t => t.id === item.id ? res.data : t));
            } catch {
              showToast('მაგიდის სტატუსი ვერ შეიცვალა', 'error');
            }
          }}
          trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
          thumbColor={item.isActive ? COLORS.primary : COLORS.textMuted}
        />
        <TouchableOpacity onPress={() => remove(item)} style={styles.delete}><Ionicons name="trash-outline" size={18} color={COLORS.error}/></TouchableOpacity>
      </View>}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.background},
  header:{flexDirection:'row',alignItems:'center',gap:SPACING.sm,padding:SPACING.md,backgroundColor:COLORS.surface,borderBottomWidth:1,borderBottomColor:COLORS.border},
  back:{width:38,height:38,borderRadius:12,backgroundColor:COLORS.surfaceElevated,alignItems:'center',justifyContent:'center'},
  title:{fontSize:18,fontWeight:'900',color:COLORS.text},
  subtitle:{fontSize:11,color:COLORS.textSecondary,marginTop:2},
  form:{margin:SPACING.md,padding:SPACING.md,borderRadius:RADIUS.lg,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.surface,gap:SPACING.sm},
  formTitle:{fontSize:15,fontWeight:'900',color:COLORS.text},
  input:{height:44,borderWidth:1,borderColor:COLORS.border,borderRadius:11,paddingHorizontal:12,color:COLORS.text,backgroundColor:COLORS.surfaceElevated},
  shapeRow:{flexDirection:'row',gap:SPACING.sm},
  shapeBtn:{flex:1,height:40,borderRadius:10,borderWidth:1,borderColor:COLORS.border,alignItems:'center',justifyContent:'center'},
  shapeActive:{borderColor:COLORS.primary,backgroundColor:COLORS.primaryLight},
  shapeText:{fontSize:11,color:COLORS.textSecondary,fontWeight:'700'},
  shapeTextActive:{color:COLORS.primary},
  createBtn:{height:46,borderRadius:11,backgroundColor:COLORS.primary,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},
  createText:{fontSize:13,fontWeight:'900',color:'#fff'},
  row:{flexDirection:'row',alignItems:'center',gap:SPACING.sm,padding:SPACING.md,marginBottom:SPACING.sm,borderRadius:RADIUS.lg,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.surface},
  tableVisual:{width:50,height:50,borderRadius:10,backgroundColor:COLORS.primaryLight,alignItems:'center',justifyContent:'center'},
  round:{borderRadius:25},
  rectangle:{width:65},
  tableName:{fontSize:11,fontWeight:'900',color:COLORS.primary},
  tableCapacity:{fontSize:9,color:COLORS.textSecondary},
  copy:{flex:1,gap:2},
  rowTitle:{fontSize:13,fontWeight:'900',color:COLORS.text},
  rowMeta:{fontSize:10,color:COLORS.textSecondary},
  status:{fontSize:9,color:COLORS.success,fontWeight:'800'},
  delete:{width:34,height:34,borderRadius:10,backgroundColor:COLORS.error+'10',alignItems:'center',justifyContent:'center'},
  empty:{alignItems:'center',justifyContent:'center',paddingVertical:50},
  emptyTitle:{fontSize:16,fontWeight:'900',color:COLORS.text},
  emptySub:{fontSize:12,lineHeight:19,color:COLORS.textSecondary,textAlign:'center',maxWidth:300,marginTop:4},
});
