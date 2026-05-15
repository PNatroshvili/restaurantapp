import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { io, Socket } from 'socket.io-client';
import { COLORS, SPACING, RADIUS } from '../../constants';
import { bookingsApi } from '../../api/bookings';
import { managerApi } from '../../api/restaurants';
import { useAuthStore } from '../../store/authStore';
import { Booking, Restaurant, RootStackParamList } from '../../types';

const SOCKET_URL = 'http://localhost:3000';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending:   { label: 'მოლოდინში',       color: COLORS.warning, icon: 'time-outline' },
  confirmed: { label: 'დადასტურებული',  color: COLORS.success, icon: 'checkmark-circle-outline' },
  cancelled: { label: 'გაუქმებული',     color: COLORS.error,   icon: 'close-circle-outline' },
  rejected:  { label: 'უარყოფილი',      color: COLORS.error,   icon: 'ban-outline' },
};

const MANAGE_CARDS: {
  icon: string; label: string; sub: string; color: string;
  route: keyof RootStackParamList;
}[] = [
  { icon: 'information-circle-outline', label: 'ინფორმაცია',     sub: 'სახელი, მისამართი, ტელეფონი',     color: '#2980B9', route: 'ManagerRestaurantInfo' },
  { icon: 'restaurant-outline',         label: 'მენიუ',           sub: 'კატეგორიები და კერძები',           color: '#E67E22', route: 'ManagerMenu' },
  { icon: 'images-outline',             label: 'ფოტოგალერეა',    sub: 'სურათების ატვირთვა',               color: '#8E44AD', route: 'ManagerPhotos' },
  { icon: 'time-outline',               label: 'სამუშაო საათები', sub: 'გახსნისა და დახურვის დრო',        color: '#27AE60', route: 'ManagerWorkingHours' },
  { icon: 'pricetag-outline',           label: 'ფასდაკლება',     sub: 'პროცენტული ფასდაკლება',           color: '#C0392B', route: 'ManagerDiscounts' },
  { icon: 'megaphone-outline',          label: 'ღონისძიებები',   sub: 'სპეციალური შეთავაზებები',         color: '#9B59B6', route: 'ManagerEvents' },
];

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '44' }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ManagerScreen() {
  const nav = useNavigation<Nav>();
  const user = useAuthStore(s => s.user);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('pending');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const socket = io(`${SOCKET_URL}/bookings`, { path: '/socket.io', transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('joinManagerRoom', user.id);
    socket.on('newBooking', (booking: Booking) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBookings(prev => [booking, ...prev]);
    });
    socket.on('bookingUpdated', (updated: Booking) => {
      setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
    });
    return () => { socket.disconnect(); };
  }, [user?.id]);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [bRes, rRes] = await Promise.allSettled([
        bookingsApi.getMyRestaurant(),
        managerApi.getMyRestaurant(),
      ]);
      if (bRes.status === 'fulfilled') setBookings(bRes.value.data);
      if (rRes.status === 'fulfilled') setRestaurant(rRes.value.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const today = new Date().toISOString().split('T')[0];
  const pending   = bookings.filter(b => b.status === 'pending').length;
  const confirmed = bookings.filter(b => b.status === 'confirmed').length;
  const todayTotal = bookings.filter(b => b.date === today).length;
  const totalGuests = bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + b.guestsCount, 0);

  const DAY_LABELS = ['კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];
  const bookingsByDay = DAY_LABELS.map((_, i) =>
    bookings.filter(b => new Date(b.date).getDay() === i).length
  );
  const maxDay = Math.max(...bookingsByDay, 1);

  const handleConfirm = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await bookingsApi.updateStatus(id, 'confirmed');
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' } : b));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('შეცდომა', 'სტატუსი ვერ შეიცვალა');
    }
  };

  const handleReject = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('უარყოფა', 'ჯავშნის უარყოფა?', [
      { text: 'არა', style: 'cancel' },
      {
        text: 'უარყოფა', style: 'destructive', onPress: async () => {
          try {
            await bookingsApi.updateStatus(id, 'rejected');
            setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'rejected' } : b));
          } catch {
            Alert.alert('შეცდომა', 'სტატუსი ვერ შეიცვალა');
          }
        },
      },
    ]);
  };

  const goToCard = (route: keyof RootStackParamList) => {
    if (!restaurant) { Alert.alert('', 'რესტორანი ჯერ ვერ ჩაიტვირთა'); return; }
    Haptics.selectionAsync();
    nav.navigate(route as any, { restaurantId: restaurant.id });
  };

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'pending',   label: 'მოლოდინში' },
    { key: 'confirmed', label: 'დადასტურებული' },
    { key: 'all',       label: 'ყველა' },
  ];
  const displayed = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>მენეჯერის პანელი</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {restaurant?.name || 'რესტორანი იტვირთება...'}
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => load()}>
            <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="მოლოდინში"    value={pending}    icon="time-outline"             color={COLORS.warning} />
          <StatCard label="დადასტ."      value={confirmed}  icon="checkmark-circle-outline" color={COLORS.success} />
          <StatCard label="დღეს სულ"     value={todayTotal} icon="today-outline"             color={COLORS.primary} />
          <StatCard label="სტუმარი სულ"  value={totalGuests} icon="people-outline"           color="#9B59B6" />
        </View>

        {/* Analytics chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ჯავშნები კვირის მიხედვით</Text>
          <View style={styles.chart}>
            {bookingsByDay.map((count, i) => (
              <View key={i} style={styles.chartBar}>
                <Text style={styles.chartCount}>{count > 0 ? count : ''}</Text>
                <View style={styles.chartBarBg}>
                  <View style={[styles.chartBarFill, { height: `${(count / maxDay) * 100}%` }]} />
                </View>
                <Text style={styles.chartLabel}>{DAY_LABELS[i]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Manage cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>რესტორნის მართვა</Text>
          {!restaurant ? (
            <View style={styles.noRestCard}>
              <Ionicons name="link-outline" size={32} color={COLORS.warning} />
              <Text style={styles.noRestTitle}>რესტორანი არ არის მიბმული</Text>
              <Text style={styles.noRestSub}>ადმინისტრატორმა უნდა დაუკავშიროს თქვენს ანგარიშს რესტორანი. დაელოდეთ ან დაუკავშირდით მხარდაჭერას.</Text>
            </View>
          ) : (
            <View style={styles.cardsGrid}>
              {MANAGE_CARDS.map(c => (
                <TouchableOpacity
                  key={c.route}
                  style={styles.manageCard}
                  activeOpacity={0.75}
                  onPress={() => goToCard(c.route)}
                >
                  <View style={[styles.manageIcon, { backgroundColor: c.color + '22' }]}>
                    <Ionicons name={c.icon as any} size={26} color={c.color} />
                  </View>
                  <Text style={styles.manageLabel}>{c.label}</Text>
                  <Text style={styles.manageSub} numberOfLines={1}>{c.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Bookings section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ჯავშნები</Text>

          <View style={styles.filterRow}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
                {f.key !== 'all' && (
                  <View style={[styles.filterBadge, filter === f.key && styles.filterBadgeActive]}>
                    <Text style={[styles.filterBadgeText, filter === f.key && styles.filterBadgeTextActive]}>
                      {f.key === 'pending' ? pending : confirmed}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {displayed.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="calendar-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>ამ კატეგორიაში ჯავშნები არ არის</Text>
            </View>
          ) : (
            displayed.map(b => {
              const cfg = STATUS_CONFIG[b.status] || { label: b.status, color: COLORS.textMuted, icon: 'ellipse-outline' };
              return (
                <View key={b.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName} numberOfLines={1}>{(b as any).user?.name || 'სტუმარი'}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: cfg.color + '22' }]}>
                        <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                    <View style={styles.detailsRight}>
                      <View style={styles.detailItem}><Ionicons name="calendar-outline" size={13} color={COLORS.textSecondary} /><Text style={styles.detailText}>{b.date}</Text></View>
                      <View style={styles.detailItem}><Ionicons name="time-outline" size={13} color={COLORS.textSecondary} /><Text style={styles.detailText}>{b.time}</Text></View>
                      <View style={styles.detailItem}><Ionicons name="people-outline" size={13} color={COLORS.textSecondary} /><Text style={styles.detailText}>{b.guestsCount} სტ.</Text></View>
                    </View>
                  </View>
                  {b.comment ? (
                    <View style={styles.commentRow}>
                      <Ionicons name="chatbubble-outline" size={12} color={COLORS.textMuted} />
                      <Text style={styles.commentText} numberOfLines={2}>{b.comment}</Text>
                    </View>
                  ) : null}
                  <View style={styles.actionRow}>
                    {b.status === 'pending' ? (
                      <>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(b.id)}>
                          <Ionicons name="close" size={16} color={COLORS.error} />
                          <Text style={styles.rejectText}>უარყოფა</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={() => handleConfirm(b.id)}>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                          <Text style={styles.confirmText}>დადასტურება</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                    <TouchableOpacity style={styles.chatBtn} onPress={() => nav.navigate('Chat', { bookingId: b.id, restaurantName: (b as any).restaurant?.name ?? 'სტუმარი' })}>
                      <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.primary, marginTop: 2, fontWeight: '600' },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', gap: 6, borderWidth: 1 },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', fontWeight: '600' },
  section: { paddingHorizontal: SPACING.md, marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  manageCard: { width: '47%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: 6 },
  manageIcon: { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  manageLabel: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  manageSub: { fontSize: 11, color: COLORS.textSecondary },
  filterRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  filterTextActive: { color: '#fff' },
  filterBadge: { backgroundColor: COLORS.border, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary },
  filterBadgeTextActive: { color: '#fff' },
  noRestCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.warning + '44', padding: SPACING.lg, alignItems: 'center', gap: SPACING.sm },
  noRestTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  noRestSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: SPACING.sm },
  emptyText: { fontSize: 13, color: COLORS.textSecondary },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: SPACING.sm },
  cardTop: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.md },
  cardInfo: { flex: 1, gap: 6 },
  cardName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  detailsRight: { gap: 4, alignItems: 'flex-end' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  commentText: { flex: 1, fontSize: 12, color: COLORS.textMuted },
  actionRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRightWidth: 1, borderRightColor: COLORS.border },
  rejectText: { fontSize: 13, color: COLORS.error, fontWeight: '700' },
  confirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: COLORS.primary },
  confirmText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  chatBtn: { paddingHorizontal: SPACING.md, paddingVertical: 12, borderLeftWidth: 1, borderLeftColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },

  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6, paddingTop: 8 },
  chartBar: { flex: 1, alignItems: 'center', gap: 4 },
  chartCount: { fontSize: 10, fontWeight: '800', color: COLORS.primary, height: 14 },
  chartBarBg: { flex: 1, width: '100%', backgroundColor: COLORS.surfaceElevated, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  chartBarFill: { width: '100%', backgroundColor: COLORS.primary + 'BB', borderRadius: 4 },
  chartLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
});
