import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { waitlistApi, WaitlistEntry } from '../../api/waitlist';
import { COLORS, RADIUS, SPACING } from '../../constants';
import { showToast } from '../../components/common/Toast';

export default function WaitlistScreen() {
  const navigation=useNavigation();
  const [items,setItems]=useState<WaitlistEntry[]>([]);
  const [refreshing,setRefreshing]=useState(false);

  const load=useCallback(async(refresh=false)=>{
    if(refresh)setRefreshing(true);
    try{const res=await waitlistApi.getMine();setItems(res.data||[]);}
    catch{showToast('მოლოდინის სიის ჩატვირთვა ვერ მოხერხდა','error');}
    finally{setRefreshing(false);}
  },[]);
  useFocusEffect(useCallback(()=>{load();},[load]));

  const cancel=(item:WaitlistEntry)=>{
    Alert.alert('მოთხოვნის გაუქმება','გსურთ მოლოდინის სიის მოთხოვნის გაუქმება?',[
      {text:'არა',style:'cancel'},
      {text:'გაუქმება',style:'destructive',onPress:async()=>{
        try{await waitlistApi.cancel(item.id);setItems(prev=>prev.map(x=>x.id===item.id?{...x,status:'cancelled'}:x));}
        catch{showToast('მოთხოვნა ვერ გაუქმდა','error');}
      }},
    ]);
  };

  return <SafeAreaView style={styles.root} edges={['top']}>
    <View style={styles.header}><TouchableOpacity style={styles.back} onPress={()=>navigation.goBack()}><Ionicons name="arrow-back" size={21} color={COLORS.text}/></TouchableOpacity><View style={{flex:1}}><Text style={styles.title}>მოლოდინის სია</Text><Text style={styles.subtitle}>თავისუფალი მაგიდის მოლოდინი</Text></View></View>
    <FlatList
      data={items}
      keyExtractor={x=>x.id}
      contentContainerStyle={items.length?styles.list:styles.emptyList}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>load(true)} tintColor={COLORS.primary} colors={[COLORS.primary]}/>}
      ListEmptyComponent={<View style={styles.empty}><Ionicons name="hourglass-outline" size={46} color={COLORS.textMuted}/><Text style={styles.emptyTitle}>მოლოდინის სია ცარიელია</Text><Text style={styles.emptySub}>როცა სასურველ რესტორანში ადგილი აღარ არის, იქიდან შეძლებ მოლოდინის სიაში დამატებას.</Text></View>}
      renderItem={({item})=><View style={styles.row}><View style={styles.icon}><Ionicons name="hourglass-outline" size={18} color={COLORS.primary}/></View><View style={styles.copy}><Text style={styles.date}>{item.date}</Text><Text style={styles.meta}>{item.timeFrom||'ნებისმიერი დრო'}{item.timeTo?' → '+item.timeTo:''} · {item.guestsCount} სტუმარი</Text><Text style={[styles.status,item.status==='notified'&&styles.notified]}>{item.status==='waiting'?'მოლოდინში':item.status==='notified'?'ადგილი გამოჩნდა':item.status==='cancelled'?'გაუქმებული':item.status}</Text></View>{(item.status==='waiting'||item.status==='notified')?<TouchableOpacity onPress={()=>cancel(item)} style={styles.cancelBtn}><Ionicons name="close" size={15} color={COLORS.error}/></TouchableOpacity>:null}</View>}
    />
  </SafeAreaView>;
}

const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:COLORS.background},
 header:{flexDirection:'row',alignItems:'center',gap:SPACING.sm,padding:SPACING.md,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.surface},
 back:{width:38,height:38,borderRadius:12,backgroundColor:COLORS.surfaceElevated,alignItems:'center',justifyContent:'center'},
 title:{fontSize:18,fontWeight:'900',color:COLORS.text},
 subtitle:{fontSize:11,color:COLORS.textSecondary,marginTop:2},
 list:{padding:SPACING.md,gap:SPACING.sm},
 emptyList:{flexGrow:1,padding:SPACING.xl},
 row:{flexDirection:'row',gap:SPACING.sm,padding:SPACING.md,backgroundColor:COLORS.surface,borderRadius:RADIUS.lg,borderWidth:1,borderColor:COLORS.border,alignItems:'center'},
 icon:{width:42,height:42,borderRadius:13,backgroundColor:COLORS.primary+'18',alignItems:'center',justifyContent:'center'},
 copy:{flex:1,gap:3},
 date:{fontSize:14,fontWeight:'900',color:COLORS.text},
 meta:{fontSize:11,color:COLORS.textSecondary},
 status:{fontSize:10,fontWeight:'800',color:COLORS.textMuted},
 notified:{color:COLORS.primary},
 cancelBtn:{width:34,height:34,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.error+'10'},
 empty:{flex:1,alignItems:'center',justifyContent:'center',gap:SPACING.sm},
 emptyTitle:{fontSize:16,fontWeight:'900',color:COLORS.text,textAlign:'center'},
 emptySub:{fontSize:12,lineHeight:19,color:COLORS.textSecondary,textAlign:'center',maxWidth:300},
});
