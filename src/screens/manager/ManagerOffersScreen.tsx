import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { managerApi } from '../../api/restaurants';
import { COLORS, RADIUS, SPACING } from '../../constants';
import { RestaurantOffer, RootStackParamList } from '../../types';
import { showToast } from '../../components/common/Toast';

type RouteProps = RouteProp<RootStackParamList, 'ManagerOffers'>;

export default function ManagerOffersScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { restaurantId } = route.params;
  const [offers, setOffers] = useState<RestaurantOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title:'', description:'', discountPercent:'', startDate:'', endDate:'', startTime:'', endTime:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await managerApi.getOffers(); setOffers(res.data || []); }
    catch { showToast('შეთავაზებების ჩატვირთვა ვერ მოხერხდა', 'error'); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = async () => {
    const title = form.title.trim();
    const discount = Number(form.discountPercent);
    if (!title) { showToast('შეთავაზების სახელი აუცილებელია', 'error'); return; }
    if (!Number.isInteger(discount) || discount < 0 || discount > 90) { showToast('ფასდაკლება უნდა იყოს 0-90%', 'error'); return; }
    setSaving(true);
    try {
      await managerApi.createOffer(restaurantId, {
        title,
        description: form.description.trim() || undefined,
        discountPercent: discount,
        startDate: form.startDate.trim() || null,
        endDate: form.endDate.trim() || null,
        startTime: form.startTime.trim() || null,
        endTime: form.endTime.trim() || null,
        isActive: true,
      });
      setForm({ title:'', description:'', discountPercent:'', startDate:'', endDate:'', startTime:'', endTime:'' });
      await load();
      showToast('შეთავაზება შეიქმნა');
    } catch (e:any) { showToast(e?.response?.data?.message || 'შეთავაზება ვერ შეიქმნა', 'error'); }
    finally { setSaving(false); }
  };

  const toggle = async (offer: RestaurantOffer) => {
    try {
      const res = await managerApi.updateOffer(offer.id, { isActive: !offer.isActive });
      setOffers(prev => prev.map(x => x.id === offer.id ? res.data : x));
    } catch { showToast('სტატუსის შეცვლა ვერ მოხერხდა', 'error'); }
  };

  const remove = (offer: RestaurantOffer) => {
    Alert.alert('შეთავაზების წაშლა', 'ნამდვილად გსურთ ამ შეთავაზების წაშლა?', [
      { text:'არა', style:'cancel' },
      { text:'წაშლა', style:'destructive', onPress: async () => {
        try { await managerApi.deleteOffer(offer.id); setOffers(prev => prev.filter(x => x.id !== offer.id)); }
        catch { showToast('შეთავაზება ვერ წაიშალა', 'error'); }
      }},
    ]);
  };

  return <SafeAreaView style={styles.root} edges={['top']}>
    <View style={styles.header}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={21} color={COLORS.text}/></TouchableOpacity>
      <View style={{flex:1}}><Text style={styles.title}>შეთავაზებები</Text><Text style={styles.subtitle}>მომხმარებლისთვის ნაჩვენები აქციები</Text></View>
    </View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <Text style={styles.formTitle}>ახალი შეთავაზება</Text>
        <TextInput style={styles.input} placeholder="სათაური" placeholderTextColor={COLORS.textMuted} value={form.title} onChangeText={v=>setForm({...form,title:v})}/>
        <TextInput style={styles.input} placeholder="ფასდაკლება % (0-90)" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" value={form.discountPercent} onChangeText={v=>setForm({...form,discountPercent:v.replace(/\D/g,'').slice(0,2)})}/>
        <TextInput style={styles.input} placeholder="აღწერა (არასავალდებულო)" placeholderTextColor={COLORS.textMuted} value={form.description} onChangeText={v=>setForm({...form,description:v})}/>
        <View style={styles.two}><TextInput style={[styles.input,styles.half]} placeholder="დაწყება YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} value={form.startDate} onChangeText={v=>setForm({...form,startDate:v})}/><TextInput style={[styles.input,styles.half]} placeholder="დასრულება YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} value={form.endDate} onChangeText={v=>setForm({...form,endDate:v})}/></View>
        <View style={styles.two}><TextInput style={[styles.input,styles.half]} placeholder="დაწყება HH:MM" placeholderTextColor={COLORS.textMuted} value={form.startTime} onChangeText={v=>setForm({...form,startTime:v})}/><TextInput style={[styles.input,styles.half]} placeholder="დასრულება HH:MM" placeholderTextColor={COLORS.textMuted} value={form.endTime} onChangeText={v=>setForm({...form,endTime:v})}/></View>
        <TouchableOpacity style={[styles.createBtn,saving&&{opacity:.5}]} onPress={create} disabled={saving}>{saving?<ActivityIndicator color="#fff"/>:<><Ionicons name="add" size={18} color="#fff"/><Text style={styles.createText}>შეთავაზების შექმნა</Text></>}</TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>არსებული შეთავაზებები</Text>
      {loading ? <ActivityIndicator color={COLORS.primary} style={{marginTop:24}}/> : offers.length ? offers.map(offer => <View key={offer.id} style={styles.offer}>
        <View style={styles.offerIcon}><Ionicons name="pricetag-outline" size={18} color={COLORS.primary}/></View>
        <View style={styles.offerCopy}><Text style={styles.offerTitle} numberOfLines={1}>{offer.title}</Text><Text style={styles.offerMeta}>{offer.discountPercent ? '-'+offer.discountPercent+'%' : 'სპეციალური შეთავაზება'}{offer.startDate ? ' · '+offer.startDate : ''}{offer.endDate ? ' → '+offer.endDate : ''}</Text>{offer.description ? <Text style={styles.offerDesc} numberOfLines={2}>{offer.description}</Text> : null}</View>
        <View style={styles.offerActions}><TouchableOpacity onPress={() => toggle(offer)}><Ionicons name={offer.isActive?'pause-circle-outline':'play-circle-outline'} size={22} color={offer.isActive?COLORS.success:COLORS.textMuted}/></TouchableOpacity><TouchableOpacity onPress={() => remove(offer)}><Ionicons name="trash-outline" size={20} color={COLORS.error}/></TouchableOpacity></View>
      </View>) : <View style={styles.empty}><Ionicons name="pricetag-outline" size={40} color={COLORS.textMuted}/><Text style={styles.emptyTitle}>შეთავაზებები ჯერ არ არის</Text><Text style={styles.emptySub}>შექმენი პირველი აქცია, რომელიც მომხმარებლის restaurant page-ზე გამოჩნდება.</Text></View>}
    </ScrollView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.background},
  header:{flexDirection:'row',alignItems:'center',gap:SPACING.sm,padding:SPACING.md,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.surface},
  back:{width:38,height:38,borderRadius:12,backgroundColor:COLORS.surfaceElevated,alignItems:'center',justifyContent:'center'},
  title:{fontSize:18,fontWeight:'900',color:COLORS.text},
  subtitle:{fontSize:11,color:COLORS.textSecondary,marginTop:2},
  content:{padding:SPACING.md,paddingBottom:48},
  form:{backgroundColor:COLORS.surface,borderRadius:RADIUS.lg,borderWidth:1,borderColor:COLORS.border,padding:SPACING.md,gap:SPACING.sm},
  formTitle:{fontSize:15,fontWeight:'900',color:COLORS.text,marginBottom:4},
  input:{height:46,borderWidth:1,borderColor:COLORS.border,borderRadius:12,paddingHorizontal:12,color:COLORS.text,backgroundColor:COLORS.surfaceElevated},
  two:{flexDirection:'row',gap:SPACING.sm},
  half:{flex:1},
  createBtn:{height:48,borderRadius:12,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:7,marginTop:4},
  createText:{fontSize:13,fontWeight:'900',color:'#fff'},
  sectionTitle:{fontSize:16,fontWeight:'900',color:COLORS.text,marginTop:SPACING.xl,marginBottom:SPACING.sm},
  offer:{flexDirection:'row',alignItems:'flex-start',gap:SPACING.sm,padding:SPACING.md,backgroundColor:COLORS.surface,borderRadius:RADIUS.lg,borderWidth:1,borderColor:COLORS.border,marginBottom:SPACING.sm},
  offerIcon:{width:42,height:42,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.primary+'18'},
  offerCopy:{flex:1,gap:3},
  offerTitle:{fontSize:14,fontWeight:'900',color:COLORS.text},
  offerMeta:{fontSize:11,fontWeight:'700',color:COLORS.primary},
  offerDesc:{fontSize:11,color:COLORS.textSecondary,lineHeight:16},
  offerActions:{gap:10,alignItems:'center'},
  empty:{alignItems:'center',paddingVertical:36,gap:SPACING.sm},
  emptyTitle:{fontSize:15,fontWeight:'900',color:COLORS.text},
  emptySub:{fontSize:12,lineHeight:18,color:COLORS.textSecondary,textAlign:'center',maxWidth:290},
});
