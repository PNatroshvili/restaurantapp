import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Alert } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/authStore';
import { bookingsApi } from '../../api/bookings';
import { Booking, RootStackParamList } from '../../types';
import { COLORS, SPACING, RADIUS, BOOKING_STATUSES } from '../../constants';
import Button from '../../components/common/Button';
import { SkeletonRestaurantRow } from '../../components/common/Skeleton';
import ReviewPromptModal from '../../components/common/ReviewPromptModal';
import QRModal from '../../components/common/QRModal';
import ConfirmModal from '../../components/common/ConfirmModal';

const SOCKET_URL = 'http://localhost:3000';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function sendBookingNotification(title: string, body: string) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: asked } = await Notifications.requestPermissionsAsync();
      if (asked !== 'granted') return;
    }
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch {
    // notifications not critical — silent fail
  }
}

async function saveBookingToCalendar(booking: Booking) {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('', 'კალენდარზე წვდომა გჭირდებათ');
      return;
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const writable = calendars.find(c => c.allowsModifications);
    if (!writable) { Alert.alert('', 'კალენდარი ვერ მოიძებნა'); return; }

    // Parse date "YYYY-MM-DD" and time "HH:MM"
    const [y, mo, d] = (booking.date ?? '').split('-').map(Number);
    const [h, m] = (booking.time ?? '00:00').split(':').map(Number);
    const start = new Date(y, mo - 1, d, h, m);
    const end   = new Date(start.getTime() + 2 * 60 * 60 * 1000); // assume 2 h

    await Calendar.createEventAsync(writable.id, {
      title: `🍽️ ${booking.restaurant?.name ?? 'რესტორანი'}`,
      location: booking.restaurant?.address ?? '',
      startDate: start,
      endDate: end,
      notes: `სტუმრები: ${booking.guestsCount}`,
      timeZone: 'Asia/Tbilisi',
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('✅', 'კალენდარში დაემატა');
  } catch {
    Alert.alert('შეცდომა', 'კალენდარში ვერ დაემატა');
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending:   { label: 'მოლოდინში',      color: COLORS.warning,  icon: 'time-outline' },
  confirmed: { label: 'დადასტურებული', color: COLORS.success,  icon: 'checkmark-circle-outline' },
  cancelled: { label: 'გაუქმებული',    color: COLORS.error,    icon: 'close-circle-outline' },
  rejected:  { label: 'უარყოფილი',     color: COLORS.error,    icon: 'ban-outline' },
};

export default function BookingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated, user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [qrBooking, setQrBooking] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    const socket = io(`${SOCKET_URL}/bookings`, { path: '/socket.io', transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('joinUserRoom', user.id);
    socket.on('bookingUpdated', (updated: Booking) => {
      setBookings(prev => {
        const existing = prev.find(b => b.id === updated.id);
        if (existing && existing.status === 'pending' && updated.status === 'confirmed') {
          setReviewBooking(updated);
          sendBookingNotification(
            '✅ ჯავშანი დადასტურდა',
            `${updated.restaurant?.name ?? 'რესტორანი'} — ${updated.date} ${updated.time}`,
          );
        } else if (existing && existing.status === 'pending' && updated.status === 'rejected') {
          sendBookingNotification(
            '❌ ჯავშანი უარყოფილია',
            `${updated.restaurant?.name ?? 'რესტორანი'} — ${updated.date} ${updated.time}`,
          );
        }
        return prev.map(b => b.id === updated.id ? { ...b, ...updated } : b);
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    });
    return () => { socket.disconnect(); };
  }, [isAuthenticated, user?.id]);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { data } = await bookingsApi.getMy();
      setBookings(prev => {
        // detect newly confirmed bookings for review prompt
        if (prev.length > 0) {
          const nowConfirmed = data.find(
            b => b.status === 'confirmed' && prev.find(p => p.id === b.id && p.status === 'pending')
          );
          if (nowConfirmed) setReviewBooking(nowConfirmed);
        }
        return data;
      });
    } catch {
      // silent — pull-to-refresh retry available
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    if (!isAuthenticated) return;
    load();
    // auto-refresh every 30s while screen is focused
    pollRef.current = setInterval(() => load(), 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isAuthenticated]));

  const cancel = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCancelTarget(id);
  };

  const doCancel = async () => {
    if (!cancelTarget) return;
    const id = cancelTarget;
    setCancelTarget(null);
    try {
      await bookingsApi.cancel(id);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // silent
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>ჩემი ჯავშნები</Text>
        </View>
        <View style={styles.guestWrap}>
          <Ionicons name="calendar-outline" size={56} color={COLORS.textMuted} />
          <Text style={styles.guestTitle}>ჯავშნები არ გაქვთ</Text>
          <Text style={styles.guestSub}>შედით ანგარიშში ჯავშნების სანახავად</Text>
          <Button label="შესვლა" onPress={() => navigation.navigate('Login')} style={{ marginTop: SPACING.lg, width: 200 }} />
        </View>
      </SafeAreaView>
    );
  }

  const displayed = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'ყველა' },
    { key: 'pending', label: 'მოლოდინში' },
    { key: 'confirmed', label: 'დადასტურებული' },
    { key: 'cancelled', label: 'გაუქმებული' },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <ConfirmModal
        visible={!!cancelTarget}
        title="ჯავშნის გაუქმება"
        message="ნამდვილად გსურთ ამ ჯავშნის გაუქმება?"
        confirmLabel="გაუქმება"
        destructive
        icon="calendar-clear-outline"
        onConfirm={doCancel}
        onCancel={() => setCancelTarget(null)}
      />
      <QRModal
        visible={!!qrBooking}
        bookingId={qrBooking?.id ?? ''}
        restaurantName={qrBooking?.restaurant?.name ?? ''}
        date={qrBooking?.date ?? ''}
        time={qrBooking?.time ?? ''}
        guests={qrBooking?.guestsCount ?? 1}
        onClose={() => setQrBooking(null)}
      />
      <ReviewPromptModal
        visible={!!reviewBooking}
        restaurantName={reviewBooking?.restaurant?.name ?? ''}
        onSubmit={(_rating, _comment) => setReviewBooking(null)}
        onDismiss={() => setReviewBooking(null)}
      />
      <View style={styles.header}>
        <Text style={styles.title}>ჩემი ჯავშნები</Text>
        <TouchableOpacity onPress={() => load()}>
          <Ionicons name="refresh-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ padding: SPACING.md, gap: SPACING.sm }}>
          {[1, 2, 3, 4].map(i => <SkeletonRestaurantRow key={i} />)}
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={b => b.id}
          contentContainerStyle={{ padding: SPACING.md, gap: SPACING.md, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>
                {filter === 'all' ? 'ჯავშნები არ გაქვთ' : 'ამ კატეგორიაში ჯავშნი არ მოიძებნა'}
              </Text>
              <Text style={styles.emptySub}>
                {filter === 'all' ? 'დაჯავშნეთ თქვენი პირველი მაგიდა თბილისის საუკეთესო რესტორნებში' : 'სხვა ფილტრი სცადეთ'}
              </Text>
              {filter === 'all' && (
                <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('Main', { screen: 'Home' } as any)}>
                  <Ionicons name="search-outline" size={16} color="#fff" />
                  <Text style={styles.exploreBtnText}>რესტორნების ძიება</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item: b }) => {
            const cfg = STATUS_CONFIG[b.status] || { label: b.status, color: COLORS.textMuted, icon: 'ellipse-outline' };
            const cover = b.restaurant?.cover_photo;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => b.restaurant?.id && navigation.navigate('RestaurantDetail', { id: b.restaurant.id })}
                activeOpacity={0.85}
              >
                {/* Top row: image + restaurant info */}
                <View style={styles.cardTop}>
                  {cover ? (
                    <Image source={{ uri: cover }} style={styles.cardImg} contentFit="cover" transition={200} />
                  ) : (
                    <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
                      <Ionicons name="restaurant" size={24} color={COLORS.textMuted} />
                    </View>
                  )}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>{b.restaurant?.name || 'რესტორანი'}</Text>
                    <Text style={styles.cardAddress} numberOfLines={1}>{b.restaurant?.address || ''}</Text>
                    {/* Status badge */}
                    <View style={[styles.statusBadge, { backgroundColor: cfg.color + '22' }]}>
                      <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Details row */}
                <View style={styles.cardDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{b.date}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{b.time}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{b.guestsCount} სტუმ.</Text>
                  </View>
                </View>

                {b.status === 'confirmed' && (
                  <>
                    <View style={styles.actionBtnsRow}>
                      <TouchableOpacity style={[styles.qrBtn, { flex: 1 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQrBooking(b); }}>
                        <Ionicons name="qr-code-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.qrBtnText}>QR Check-in</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.chatBtn} onPress={() => navigation.navigate('Chat', { bookingId: b.id, restaurantName: b.restaurant?.name ?? 'რესტორანი' })}>
                        <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.calendarBtn}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); saveBookingToCalendar(b); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={15} color={COLORS.textSecondary} />
                      <Text style={styles.calendarBtnText}>კალენდარში დამატება</Text>
                    </TouchableOpacity>
                  </>
                )}
                {b.status === 'pending' && (
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => cancel(b.id)}>
                    <Text style={styles.cancelText}>ჯავშნის გაუქმება</Text>
                  </TouchableOpacity>
                )}
                {(b.status === 'cancelled' || b.status === 'rejected') && b.restaurant?.id && (
                  <TouchableOpacity
                    style={styles.bookAgainBtn}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('Booking', { restaurantId: b.restaurant!.id, restaurantName: b.restaurant!.name ?? 'რესტორანი' }); }}
                  >
                    <Ionicons name="refresh-outline" size={15} color={COLORS.primary} />
                    <Text style={styles.bookAgainText}>ხელახლა ჯავშნა</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },

  filterRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: '#fff' },

  guestWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  guestTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  guestSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.md },
  cardImg: { width: 80, height: 80, borderRadius: RADIUS.md },
  cardImgPlaceholder: { backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 4, justifyContent: 'center' },
  cardName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  cardAddress: { fontSize: 12, color: COLORS.textSecondary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: COLORS.border },
  cardDetails: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.lg },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },

  cancelBtn: { borderTopWidth: 1, borderTopColor: COLORS.border, padding: SPACING.md, alignItems: 'center' },
  cancelText: { fontSize: 14, color: COLORS.error, fontWeight: '700' },
  actionBtnsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  qrBtn: { borderTopWidth: 0, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  qrBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
  chatBtn: { borderLeftWidth: 1, borderLeftColor: COLORS.border, paddingHorizontal: SPACING.md, alignItems: 'center', justifyContent: 'center' },

  bookAgainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderTopWidth: 1, borderTopColor: COLORS.border, padding: SPACING.md },
  bookAgainText: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },

  calendarBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: 10 },
  calendarBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: SPACING.xl, gap: SPACING.md },
  emptyEmoji: { fontSize: 64, marginBottom: SPACING.sm },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  exploreBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: 12, borderRadius: RADIUS.full, marginTop: SPACING.sm },
  exploreBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
