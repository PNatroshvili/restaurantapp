import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { managerApi } from '../../api/restaurants';
import { COLORS, RADIUS, SPACING } from '../../constants';
import { RootStackParamList } from '../../types';
import { showToast } from '../../components/common/Toast';

type RouteProps=RouteProp<RootStackParamList,'ManagerWaitlist'>;

export default function ManagerWaitlistScreen(){
  const navigation=useNavigation(); const {restaurantId}=useRoute<RouteProps>().params;
  const [items,setItems]=useState<any[]>([]); const [refreshing,setRefreshing]=useState(false);
  const load=useCallback(async(refresh=false)=>{if(refresh)setRefreshing(true);try{const r=await managerApi.getWaitlist(restaurantId);setItems(r.data||[]);}catch{showToast('მოლოდინის სიის ჩატვირთვა ვერ მოხერხდა','error')}finally{setRefreshing(false)}},[restaurantId]);
  useFocusEffect(useCallback(()=>{load()},[load]));
  const update=async(id:string,status:string)=>{try{const r=await managerApi.updateWaitlistStatus(id,status);setItems(p=>p.map(x=>x.id===id?r.data:x));showToast(status==='notified'?'მომხმარებელს შეატყობინეთ':'მოთხოვნა განახლდა')}catch{showToast('სტატუსი ვერ შეიცვალა','error')}};
  return <SafeAreaView style={styles.root} edges={['top']}><View style={styles.header}><TouchableOpacity style={styles.back} onPress={()=>navigation.goBack()}><Ionicons name="arrow-back" size={21} color={COLORS.text}/></TouchableOpacity><View style={{flex:1}}><Text style={styles.title}>მოლოდინის სია</Text><Text style={styles.subtitle}>რესტორნის მოთხოვნები</Text></View></View><FlatList data={items} keyExtractor={x=>x.id} contentContainerStyle={items.length?styles.list:styles.emptyList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>load(true)} tintColor={COLORS.primary} colors={[COLORS.primary]}/>} ListEmptyComponent={<View style={styles.empty}><Ionicons name="hourglass-outline" size={44} color={COLORS.textMuted}/><Text style={styles.emptyTitle}>მოთხოვნები არ არის</Text><Text style={styles.emptySub}>აქ გამოჩნდება სტუმრები, რომლებიც თავისუფალ მაგიდას ელოდებიან.</Text></View>} renderItem={({item})=><View style={styles.row}><View style={styles.icon}><Ionicons name="hourglass-outline" size={18} color={COLORS.primary}/></View><View style={styles.copy}><Text style={styles.name}>{item.date} · {item.guestsCount} სტუმარი</Text><Text style={styles.meta}>{item.timeFrom||'ნებისმიერი დრო'}{item.timeTo?' → '+item.timeTo:''}</Text><Text style={styles.status}>{item.status}</Text></View>{item.status==='waiting'?<TouchableOpacity style={styles.notifyBtn} onPress={()=>update(item.id,'notified')}><Ionicons name="notifications-outline" size={15} color="#fff"/><Text style={styles.notifyText}>შეტყობინება</Text></TouchableOpacity>:item.status==='notified'?<TouchableOpacity style={styles.bookedBtn} onPress={()=>update(item.id,'booked')}><Text style={styles.bookedText}>დაჯავშნა</Text></TouchableOpacity>:null}</View>}/></SafeAreaView>;
}

const styles=StyleSheet.create({
root:{flex:1,backgroundColor:COLORS.background},
header:{flexDirection:'row',alignItems:'center',gap:SPACING.sm,padding:SPACING.md,backgroundColor:COLORS.surface,borderBottomWidth:1,borderBottomColor:COLORS.border},
back:{width:38,height:38,borderRadius:12,backgroundColor:COLORS.surfaceElevated,alignItems:'center',justifyContent:'center'},
title:{fontSize:18,fontWeight:'900',color:COLORS.text},
subtitle:{fontSize:11,color:COLORS.textSecondary,marginTop:2},
list:{padding:SPACING.md,gap:SPACING.sm},
emptyList:{flexGrow:1,padding:SPACING.xl},
row:{flexDirection:'row',alignItems:'center',gap:SPACING.sm,padding:SPACING.md,borderWidth:1,borderColor:COLORS.border,borderRadius:RADIUS.lg,backgroundColor:COLORS.surface},
icon:{width:42,height:42,borderRadius:13,backgroundColor:COLORS.primary+'18',alignItems:'center',justifyContent:'center'},
copy:{flex:1,gap:3},
name:{fontSize:13,fontWeight:'900',color:COLORS.text},
meta:{fontSize:11,color:COLORS.textSecondary},
status:{fontSize:10,fontWeight:'800',color:COLORS.textMuted},
notifyBtn:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:10,height:35,borderRadius:10,backgroundColor:COLORS.primary},
notifyText:{fontSize:10,fontWeight:'800',color:'#fff'},
bookedBtn:{paddingHorizontal:10,height:35,borderRadius:10,backgroundColor:COLORS.success,alignItems:'center',justifyContent:'center'},
bookedText:{fontSize:10,fontWeight:'800',color:'#fff'},
empty:{flex:1,alignItems:'center',justifyContent:'center',gap:SPACING.sm},
emptyTitle:{fontSize:16,fontWeight:'900',color:COLORS.text},
emptySub:{fontSize:12,lineHeight:19,textAlign:'center',color:COLORS.textSecondary,maxWidth:300},
});
