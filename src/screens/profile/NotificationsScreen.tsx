import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { notificationsApi, UserNotification } from '../../api/notifications';
import { COLORS, RADIUS, SPACING } from '../../constants';
import { showToast } from '../../components/common/Toast';

function relativeTime(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ახლა';
  if (mins < 60) return mins + ' წთ';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + ' სთ';
  return Math.floor(hours / 24) + ' დ';
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState<UserNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await notificationsApi.getAll();
      setItems(res.data?.data || []);
      setUnread(res.data?.unreadCount || 0);
      setError('');
    } catch (e) {
      setError('შეტყობინებების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markRead = async (item: UserNotification) => {
    if (item.readAt) return;
    try {
      await notificationsApi.markRead(item.id);
      setItems(prev => prev.map(n => n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n));
      setUnread(v => Math.max(0, v - 1));
    } catch {
      showToast('შეტყობინების გახსნა ვერ მოხერხდა', 'error');
    }
  };

  const markAll = async () => {
    if (!unread) return;
    try {
      await notificationsApi.markAllRead();
      setItems(prev => prev.map(n => n.readAt ? n : { ...n, readAt: new Date().toISOString() }));
      setUnread(0);
    } catch {
      showToast('შეტყობინებების მონიშვნა ვერ მოხერხდა', 'error');
    }
  };

  return <SafeAreaView style={styles.root} edges={['top']}>
    <View style={styles.header}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={21} color={COLORS.text}/></TouchableOpacity>
      <View style={{ flex: 1 }}><Text style={styles.title}>შეტყობინებები</Text><Text style={styles.subtitle}>{unread ? unread + ' წაუკითხავი' : 'ყველა შეტყობინება წაკითხულია'}</Text></View>
      {unread > 0 ? <TouchableOpacity onPress={markAll}><Text style={styles.markAll}>ყველას</Text></TouchableOpacity> : null}
    </View>
    {loading ? <View style={styles.loading}><ActivityIndicator color={COLORS.primary}/></View> :
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={items.length ? styles.list : styles.emptyList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} colors={[COLORS.primary]}/>}
        ListHeaderComponent={error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={() => load()}><Text style={styles.retry}>თავიდან</Text></TouchableOpacity></View> : null}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="notifications-off-outline" size={46} color={COLORS.textMuted}/><Text style={styles.emptyTitle}>შეტყობინებები ჯერ არ არის</Text><Text style={styles.emptySub}>აქ გამოჩნდება ჯავშნების, შეთავაზებების და ანგარიშის განახლებები.</Text></View>}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.row, !item.readAt && styles.unreadRow]} onPress={() => markRead(item)} activeOpacity={0.78}>
            <View style={styles.icon}><Ionicons name={item.type.startsWith('booking') ? 'calendar-outline' : 'notifications-outline'} size={19} color={COLORS.primary}/></View>
            <View style={styles.copy}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.body}>{item.body}</Text><Text style={styles.time}>{relativeTime(item.createdAt)}</Text></View>
            {!item.readAt ? <View style={styles.dot}/> : null}
          </TouchableOpacity>
        )}
      />
    }
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.background},
  header:{flexDirection:'row',alignItems:'center',gap:SPACING.sm,paddingHorizontal:SPACING.md,paddingVertical:SPACING.md,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.surface},
  back:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.surfaceElevated},
  title:{fontSize:18,fontWeight:'900',color:COLORS.text},
  subtitle:{fontSize:11,color:COLORS.textSecondary,marginTop:2},
  markAll:{fontSize:12,fontWeight:'800',color:COLORS.primary,paddingHorizontal:4},
  list:{padding:SPACING.md,gap:SPACING.sm},
  emptyList:{flexGrow:1,padding:SPACING.xl},
  row:{flexDirection:'row',gap:SPACING.md,padding:SPACING.md,borderRadius:RADIUS.lg,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.surface},
  unreadRow:{backgroundColor:COLORS.primaryLight,borderColor:COLORS.primary+'55'},
  icon:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.primary+'18'},
  copy:{flex:1,gap:4},
  rowTitle:{fontSize:14,fontWeight:'900',color:COLORS.text},
  body:{fontSize:12,lineHeight:18,color:COLORS.textSecondary},
  time:{fontSize:10,color:COLORS.textMuted},
  dot:{width:8,height:8,borderRadius:4,backgroundColor:COLORS.primary,marginTop:4},
  loading:{flex:1,alignItems:'center',justifyContent:'center'},
  empty:{flex:1,alignItems:'center',justifyContent:'center',gap:SPACING.sm},
  emptyTitle:{fontSize:16,fontWeight:'900',color:COLORS.text},
  emptySub:{fontSize:12,lineHeight:19,color:COLORS.textSecondary,textAlign:'center',maxWidth:280},
  error:{padding:SPACING.md,borderRadius:RADIUS.md,backgroundColor:COLORS.error+'12',borderWidth:1,borderColor:COLORS.error+'33',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  errorText:{flex:1,fontSize:12,color:COLORS.error},
  retry:{fontSize:12,fontWeight:'800',color:COLORS.primary},
});
