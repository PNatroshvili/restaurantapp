import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  Alert, KeyboardAvoidingView, Platform, Image, Animated, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { addBookingToCalendar } from '../../services/calendar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { bookingsApi } from '../../api/bookings';
import { restaurantsApi } from '../../api/restaurants';
import { waitlistApi } from '../../api/waitlist';
import { COLORS, SPACING, RADIUS } from '../../constants';
import { sendBookingConfirmation, scheduleBookingReminder } from '../../services/notifications';

type RouteProps = RouteProp<RootStackParamList, 'Booking'>;

const OCCASIONS = [
  { key: 'birthday',    label: 'დაბადების დღე', emoji: '🎂' },
  { key: 'anniversary', label: 'წლისთავი',      emoji: '💍' },
  { key: 'date',        label: 'პაემანი',        emoji: '❤️' },
  { key: 'business',   label: 'საქმიანი',       emoji: '💼' },
  { key: 'friends',    label: 'მეგობრები',      emoji: '🥂' },
  { key: 'other',      label: 'სხვა',           emoji: '✨' },
];

const GEORGIAN_WEEKDAYS = ['კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];
const GEORGIAN_MONTHS = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

export default function BookingScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { restaurantId, restaurantName, restaurantImage, date: initialDate, time: initialTime, guests: initialGuests } = route.params as any;

  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const [date, setDate] = useState(initialDate || formatDate(today));
  const [time, setTime] = useState(initialTime || '');
  const [guests, setGuests] = useState(Number.isInteger(initialGuests) ? Math.max(1, Math.min(12, initialGuests)) : 2);
  const [comment, setComment] = useState('');
  const [occasion, setOccasion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [availability, setAvailability] = useState<{ slots: { time: string; available: boolean }[]; open: boolean; reason?: string } | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [activeOffer, setActiveOffer] = useState<import('../../types').RestaurantOffer | null>(null);
  const [offerLoading, setOfferLoading] = useState(false);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    setOfferLoading(true);
    restaurantsApi.getOffers(restaurantId, date, time || undefined, guests)
      .then(res => { if (!cancelled) setActiveOffer((res.data || []).filter(x => x.isActive)[0] || null); })
      .catch(() => { if (!cancelled) setActiveOffer(null); })
      .finally(() => { if (!cancelled) setOfferLoading(false); });
    return () => { cancelled = true; };
  }, [restaurantId, date, time, guests]);

  useEffect(() => {
    let cancelled = false;
    setAvailabilityLoading(true);
    setAvailabilityError('');
    bookingsApi.getAvailability(restaurantId, date, guests)
      .then(res => {
        if (cancelled) return;
        setAvailability(res.data);
        const first = res.data?.slots?.find(s => s.available);
        setTime((prev: string) => res.data?.slots?.some(s => s.available && s.time === prev) ? prev : (first?.time || ''));
      })
      .catch(() => {
        if (!cancelled) { setAvailability(null); setTime(''); setAvailabilityError('ხელმისაწვდომი დროების ჩატვირთვა ვერ მოხერხდა'); }
      })
      .finally(() => { if (!cancelled) setAvailabilityLoading(false); });
    return () => { cancelled = true; };
  }, [restaurantId, date, guests]);

  useEffect(() => {
    if (!success || !date || !time) return;
    const updateCountdown = () => {
      const [y, m, d] = date.split('-').map(Number);
      const [h, min] = time.split(':').map(Number);
      const bookingMs = new Date(y, m - 1, d, h, min, 0).getTime();
      const diff = bookingMs - Date.now();
      if (diff <= 0) { setCountdown(''); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      if (days > 0) setCountdown(`${days} დ ${hours} სთ`);
      else if (hours > 0) setCountdown(`${hours} სთ ${mins} წთ`);
      else setCountdown(`${mins} წთ`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [success, date, time]);

  const nextDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const selectedDateObj = new Date(date);

  const joinWaitlist = async () => {
    if (joiningWaitlist || waitlistJoined) return;
    setJoiningWaitlist(true);
    try {
      await waitlistApi.join({ restaurant_id: restaurantId, date, guests_count: guests });
      setWaitlistJoined(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e:any) {
      Alert.alert('შეცდომა', e?.response?.data?.message || 'მოლოდინის სიაში დამატება ვერ მოხერხდა');
    } finally { setJoiningWaitlist(false); }
  };

  const submit = async () => {
    if (!time) { Alert.alert('', 'გთხოვთ აირჩიოთ დრო'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const occasionObj = OCCASIONS.find(o => o.key === occasion);
      const fullComment = [
        occasionObj ? `${occasionObj.emoji} ${occasionObj.label}` : '',
        comment,
      ].filter(Boolean).join('\n');
      await bookingsApi.create({ restaurant_id: restaurantId, date, time, guests_count: guests, comment: fullComment });
      await sendBookingConfirmation(restaurantName, date, time, guests).catch(() => {});
      await scheduleBookingReminder(restaurantName, date, time).catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      Animated.spring(checkAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }).start();
    } catch (e: any) {
      Alert.alert('შეცდომა', e?.response?.data?.message || 'ჯავშანი ვერ გაიგზავნა');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Success Screen ─── */
  if (success) {
    const scale = checkAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
    return (
      <SafeAreaView style={styles.successRoot}>
        <Animated.View style={[styles.successIconWrap, { transform: [{ scale }] }]}>
          <Ionicons name="checkmark-circle" size={96} color={COLORS.primary} />
        </Animated.View>
        <Text style={styles.successTitle}>ჯავშანი გაიგზავნა!</Text>
        <Text style={styles.successSub}>რესტორანი მოგწერთ დადასტურებისთვის</Text>

        <View style={styles.successCard}>
          <Text style={styles.successRestName}>{restaurantName}</Text>
          <View style={styles.successDivider} />
          <View style={styles.successRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
            <Text style={styles.successRowText}>{date}</Text>
          </View>
          <View style={styles.successRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
            <Text style={styles.successRowText}>{time}</Text>
          </View>
          <View style={styles.successRow}>
            <Ionicons name="people-outline" size={16} color={COLORS.primary} />
            <Text style={styles.successRowText}>{guests} სტუმარი</Text>
          </View>
          {occasion && (() => { const o = OCCASIONS.find(x => x.key === occasion); return o ? (
            <View style={styles.successRow}>
              <Text style={{ fontSize: 16 }}>{o.emoji}</Text>
              <Text style={styles.successRowText}>{o.label}</Text>
            </View>
          ) : null; })()}
        </View>

        {countdown !== '' && (
          <View style={styles.countdownBadge}>
            <Ionicons name="timer-outline" size={15} color={COLORS.primary} />
            <Text style={styles.countdownText}>{countdown}-ში</Text>
          </View>
        )}

        <View style={styles.freeCancelBadge}>
          <Ionicons name="shield-checkmark-outline" size={15} color={COLORS.primary} />
          <Text style={styles.freeCancelText}>უფასო გაუქმება · პირობების გარეშე</Text>
        </View>

        {/* Add to calendar */}
        <TouchableOpacity
          style={[styles.calendarBtn, calendarAdded && styles.calendarBtnDone]}
          onPress={async () => {
            if (calendarAdded) return;
            const ok = await addBookingToCalendar(restaurantName, date, time, guests);
            if (ok) {
              setCalendarAdded(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }}
          disabled={calendarAdded}
        >
          <Ionicons name={calendarAdded ? 'checkmark-circle' : 'calendar-outline'} size={18} color={calendarAdded ? COLORS.primary : COLORS.text} />
          <Text style={[styles.calendarBtnText, calendarAdded && { color: COLORS.primary }]}>
            {calendarAdded ? 'კალენდარში დამატებულია' : 'კალენდარში დამატება'}
          </Text>
        </TouchableOpacity>

        <View style={styles.successActions}>
          <TouchableOpacity
            style={styles.viewBookingsBtn}
            onPress={() => { navigation.goBack(); (navigation as any).navigate('Main', { screen: 'Bookings' }); }}
          >
            <Ionicons name="list-outline" size={17} color={COLORS.primary} />
            <Text style={styles.viewBookingsBtnText}>ჩემი ჯავშნები</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.successBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.successBtnText}>დახურვა</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ─── Main Booking Screen ─── */
  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ჯავშნა</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Restaurant strip */}
          <View style={styles.restStrip}>
            {restaurantImage
              ? <Image source={{ uri: restaurantImage }} style={styles.restThumb} />
              : <View style={[styles.restThumb, styles.restThumbPlaceholder]}>
                  <Ionicons name="restaurant" size={20} color={COLORS.textMuted} />
                </View>
            }
            <View style={{ flex: 1 }}>
              <Text style={styles.restName} numberOfLines={1}>{restaurantName}</Text>
              <View style={styles.freeCancelRow}>
                <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.primary} />
                <Text style={styles.freeCancelSmall}>უფასო გაუქმება</Text>
                {activeOffer ? <View style={styles.offerMiniRow}><Ionicons name="pricetag-outline" size={12} color={COLORS.primary} /><Text style={styles.offerMiniText} numberOfLines={1}>{activeOffer.title}{activeOffer.discountPercent ? ' · ' + activeOffer.discountPercent + '%' : ''}</Text></View> : null}
              {offerLoading ? <Text style={styles.offerLoading}>შეთავაზებებს ვამოწმებთ…</Text> : null}
            </View>
            </View>
          </View>

          {/* ── Date ── */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>თარიღი</Text>
            <Text style={styles.sectionValue}>
              {GEORGIAN_WEEKDAYS[selectedDateObj.getDay()]},{' '}
              {selectedDateObj.getDate()} {GEORGIAN_MONTHS[selectedDateObj.getMonth()]}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
            {nextDays.map((d) => {
              const iso = formatDate(d);
              const isSelected = iso === date;
              const isToday = iso === formatDate(today);
              return (
                <TouchableOpacity
                  key={iso}
                  style={[styles.dateChip, isSelected && styles.dateChipActive]}
                  onPress={() => setDate(iso)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dateWeekday, isSelected && styles.dateTextActive]}>
                    {isToday ? 'დღეს' : GEORGIAN_WEEKDAYS[d.getDay()]}
                  </Text>
                  <Text style={[styles.dateNum, isSelected && styles.dateTextActive]}>{d.getDate()}</Text>
                  <Text style={[styles.dateMonth, isSelected && styles.dateTextActive]}>
                    {GEORGIAN_MONTHS[d.getMonth()]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Guests ── */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>სტუმრები</Text>
            <View style={styles.guestStepper}>
              <TouchableOpacity
                style={[styles.stepBtn, guests <= 1 && styles.stepBtnDisabled]}
                onPress={() => setGuests(g => Math.max(1, g - 1))}
                disabled={guests <= 1}
              >
                <Ionicons name="remove" size={20} color={guests <= 1 ? COLORS.textMuted : COLORS.text} />
              </TouchableOpacity>
              <View style={styles.stepCount}>
                <Text style={styles.stepNum}>{guests}</Text>
                <Text style={styles.stepLabel}>სტუმარი</Text>
              </View>
              <TouchableOpacity
                style={[styles.stepBtn, guests >= 12 && styles.stepBtnDisabled]}
                onPress={() => setGuests(g => Math.min(12, g + 1))}
                disabled={guests >= 12}
              >
                <Ionicons name="add" size={20} color={guests >= 12 ? COLORS.textMuted : COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Time ── */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>დრო</Text>
            {time ? <Text style={styles.sectionValue}>{time}</Text> : null}
          </View>
          {availabilityLoading ? <View style={styles.timeStatus}><ActivityIndicator size="small" color={COLORS.primary} /><Text style={styles.timeStatusText}>ვამოწმებთ თავისუფალ მაგიდებს...</Text></View> : null}
          {!availabilityLoading && availabilityError ? <Text style={styles.availabilityError}>{availabilityError}</Text> : null}
          {!availabilityLoading && !availabilityError && availability?.open === false ? <Text style={styles.availabilityError}>ამ დღეს რესტორანი დაკეტილია.</Text> : null}
          {!availabilityLoading && !availabilityError && availability?.open && !availability.slots.some(s => s.available) ? (
            <TouchableOpacity style={[styles.waitlistBtn, waitlistJoined && styles.waitlistBtnDone]} onPress={joinWaitlist} disabled={joiningWaitlist || waitlistJoined}>
              {joiningWaitlist ? <ActivityIndicator size="small" color={COLORS.primary}/> : <Ionicons name={waitlistJoined ? 'checkmark-circle-outline' : 'hourglass-outline'} size={17} color={COLORS.primary}/>}
              <Text style={styles.waitlistText}>{waitlistJoined ? 'მოლოდინის სიაში ხარ' : 'თავისუფალი ადგილი არ არის — შემიყვანე მოლოდინის სიაში'}</Text>
            </TouchableOpacity>
          ) : null}          <View style={styles.timeGrid}>
            {(availability?.slots || []).map(({ time: t, available }) => {
              const isSelected = time === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeChip, !available && styles.timeChipDisabled, isSelected && styles.timeChipActive]}
                  onPress={() => setTime(t)}
                  disabled={!available}
                  accessibilityState={{ selected: isSelected, disabled: !available }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.timeText, !available && styles.timeTextDisabled, isSelected && styles.timeTextActive]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Special Occasion ── */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>სპეციალური შემთხვევა</Text>
            {occasion && <Text style={styles.sectionValue}>{OCCASIONS.find(o => o.key === occasion)?.emoji}</Text>}
          </View>
          <View style={styles.occasionGrid}>
            {OCCASIONS.map(o => {
              const active = occasion === o.key;
              return (
                <TouchableOpacity
                  key={o.key}
                  style={[styles.occasionChip, active && styles.occasionChipActive]}
                  onPress={() => {
                    setOccasion(active ? null : o.key);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.occasionEmoji}>{o.emoji}</Text>
                  <Text style={[styles.occasionLabel, active && styles.occasionLabelActive]}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Comment ── */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>შენიშვნა</Text>
            <Text style={styles.sectionMeta}>სურვილი, ალერგია, სპეციალური თხოვნა</Text>
          </View>
          <View style={styles.commentWrap}>
            <TextInput
              style={styles.textarea}
              placeholder="მაგ. ვეგეტარიანული მენიუ, დაბადების დღის მაგიდა..."
              value={comment}
              onChangeText={v => setComment(v.slice(0, 200))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholderTextColor={COLORS.textMuted}
              maxLength={200}
            />
            <Text style={styles.charCounter}>{comment.length}/200</Text>
          </View>

          {/* ── Summary ── */}
          {time ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>ჯავშნის დეტალები</Text>
              <View style={styles.summaryRow}>
                <Ionicons name="calendar-outline" size={15} color={COLORS.textSecondary} />
                <Text style={styles.summaryText}>
                  {GEORGIAN_WEEKDAYS[selectedDateObj.getDay()]}, {selectedDateObj.getDate()} {GEORGIAN_MONTHS[selectedDateObj.getMonth()]}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="time-outline" size={15} color={COLORS.textSecondary} />
                <Text style={styles.summaryText}>{time}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="people-outline" size={15} color={COLORS.textSecondary} />
                <Text style={styles.summaryText}>{guests} სტუმარი</Text>
              </View>
              {activeOffer && (
                <View style={styles.summaryRow}>
                  <Ionicons name="pricetag-outline" size={15} color={COLORS.primary} />
                  <Text style={[styles.summaryText, { color: COLORS.primary }]}>{activeOffer.title}{activeOffer.discountPercent ? ' · ' + activeOffer.discountPercent + '%' : ''}</Text>
                </View>
              )}
            </View>
          ) : null}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── Footer CTA ── */}
        <View style={styles.footer}>
          <View style={styles.footerPolicy}>
            <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.primary} />
            <Text style={styles.footerPolicyText}>უფასო გაუქმება · პირობების გარეშე</Text>
          </View>
          <TouchableOpacity
            style={[styles.ctaBtn, (!time || loading) && styles.ctaBtnDisabled]}
            onPress={submit}
            disabled={!time || loading}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>
              {loading ? 'იგზავნება...' : 'ჯავშნის გაგზავნა'}
            </Text>
            {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },

  // Restaurant strip
  restStrip: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  restThumb: { width: 52, height: 52, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceElevated },
  restThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  restName: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  freeCancelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  freeCancelSmall: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  offerMiniRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  offerMiniText: { flex: 1, fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  offerLoading: { fontSize: 10, color: COLORS.textMuted, marginTop: 3 },

  // Section headers
  sectionWrap: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  sectionValue: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  sectionMeta: { fontSize: 12, color: COLORS.textMuted },

  // Date chips
  dateScroll: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.sm },
  dateChip: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, minWidth: 60 },
  dateChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dateWeekday: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 2 },
  dateNum: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  dateMonth: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },
  dateTextActive: { color: '#fff' },

  // Guest stepper
  guestStepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, overflow: 'hidden', alignSelf: 'flex-start', marginHorizontal: SPACING.md, marginBottom: SPACING.sm },
  stepBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  stepBtnDisabled: { opacity: 0.4 },
  stepCount: { paddingHorizontal: SPACING.xl, alignItems: 'center' },
  stepNum: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  stepLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },

  // Time grid
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.sm },
  timeChip: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  timeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  timeText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  timeTextActive: { color: '#fff' },
  timeChipDisabled: { opacity: 0.38 },
  timeTextDisabled: { color: COLORS.textMuted },
  timeStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  timeStatusText: { fontSize: 12, color: COLORS.textSecondary },
  availabilityError: { fontSize: 12, color: COLORS.error, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  waitlistBtn: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, minHeight: 46, paddingHorizontal: SPACING.md, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary + '55', backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  waitlistBtnDone: { opacity: 0.75 },
  waitlistText: { flex: 1, fontSize: 12, color: COLORS.primary, fontWeight: '800', textAlign: 'center' },

  // Promo code
  promoWrap: { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.sm },
  promoInput: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, height: 48, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.surface, fontWeight: '700', letterSpacing: 2 },
  promoInputApplied: { borderColor: COLORS.primary, color: COLORS.primary },
  promoBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, height: 48, alignItems: 'center', justifyContent: 'center' },
  promoBtnDisabled: { opacity: 0.4 },
  promoBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  promoSuccess: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  promoErrorText: { fontSize: 12, color: COLORS.error, paddingHorizontal: SPACING.md, marginTop: 4 },

  // Occasion
  occasionGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.sm },
  occasionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  occasionChipActive: { backgroundColor: COLORS.primary + '18', borderColor: COLORS.primary },
  occasionEmoji: { fontSize: 16 },
  occasionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  occasionLabelActive: { color: COLORS.primary },

  // Comment
  commentWrap: { paddingHorizontal: SPACING.md },
  textarea: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md, fontSize: 14, color: COLORS.text, height: 88, backgroundColor: COLORS.surface },
  charCounter: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginTop: 4, fontWeight: '600' },

  // Summary card
  summaryCard: { marginHorizontal: SPACING.md, marginTop: SPACING.lg, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.primary + '44', padding: SPACING.md, gap: SPACING.sm },
  summaryTitle: { fontSize: 13, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  summaryText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },

  // Footer CTA
  footer: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background, gap: SPACING.sm },
  footerPolicy: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  footerPolicyText: { fontSize: 12, color: COLORS.textSecondary },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, height: 54 },
  ctaBtnDisabled: { opacity: 0.5 },
  ctaBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },

  // Success
  successRoot: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  successIconWrap: { marginBottom: SPACING.lg },
  successTitle: { fontSize: 26, fontWeight: '900', color: COLORS.text, marginBottom: SPACING.sm },
  successSub: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xl, textAlign: 'center' },
  successCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: COLORS.primary + '44', padding: SPACING.lg, marginBottom: SPACING.lg, gap: SPACING.sm },
  successRestName: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  successDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  successRowText: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  countdownBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, marginBottom: 12 },
  countdownText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  freeCancelBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary + '18', paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full, marginBottom: SPACING.xl },
  freeCancelText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  calendarBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, backgroundColor: COLORS.surface, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: SPACING.sm },
  calendarBtnDone: { borderColor: COLORS.primary + '55', backgroundColor: COLORS.primary + '11' },
  calendarBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  successActions: { width: '100%', gap: SPACING.sm },
  viewBookingsBtn: { width: '100%', height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.primary + '66' },
  viewBookingsBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  successBtn: { width: '100%', height: 54, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  successBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
