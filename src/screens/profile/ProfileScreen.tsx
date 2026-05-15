import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Image, Switch,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { bookingsApi } from '../../api/bookings';
import { restaurantsApi } from '../../api/restaurants';
import { authApi } from '../../api/auth';
import { RootStackParamList } from '../../types';
import { COLORS, SPACING, RADIUS } from '../../constants';
import Button from '../../components/common/Button';
import ConfirmModal from '../../components/common/ConfirmModal';

const APP_VERSION = '1.0.0';

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [bookingsCount, setBookingsCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar || null);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [onboardingConfirm, setOnboardingConfirm] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('notifications_enabled').then(v => {
      setNotifEnabled(v !== 'false');
    });
  }, []);

  const toggleNotifications = async (value: boolean) => {
    setNotifEnabled(value);
    await AsyncStorage.setItem('notifications_enabled', value ? 'true' : 'false');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      await Notifications.requestPermissionsAsync();
    }
  };

  const loadStats = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated) return;
    if (isRefresh) setRefreshing(true);
    await Promise.allSettled([
      bookingsApi.getMy().then(({ data }) => setBookingsCount(Array.isArray(data) ? data.length : 0)),
      restaurantsApi.getFavorites().then(({ data }) => setFavoritesCount(Array.isArray(data) ? data.length : 0)),
    ]);
    setRefreshing(false);
  }, [isAuthenticated]);

  useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('', 'გალერეაზე წვდომა საჭიროა'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLogoutConfirm(true);
  };

  const statusColor = (status: string) => {
    if (status === 'confirmed') return COLORS.success;
    if (status === 'cancelled' || status === 'rejected') return COLORS.error;
    return COLORS.warning;
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.guestContainer}>
          <View style={styles.guestAvatarCircle}>
            <Ionicons name="person" size={48} color={COLORS.textMuted} />
          </View>
          <Text style={styles.guestTitle}>პროფილი</Text>
          <Text style={styles.guestSubtitle}>შედით ანგარიშში ჯავშნების, ფავორიტების და პერსონალური კონტენტისთვის</Text>
          <Button label="შესვლა" onPress={() => navigation.navigate('Login')} style={styles.guestBtn} />
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.guestRegLink}>
              ანგარიში არ გაქვთ?{' '}
              <Text style={{ color: COLORS.primary, fontWeight: '700' }}>რეგისტრაცია</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const initial = user?.name?.[0]?.toUpperCase() || '?';

  return (
    <SafeAreaView style={styles.root}>
      <ConfirmModal
        visible={logoutConfirm}
        title="გამოსვლა"
        message="ნამდვილად გსურთ გამოსვლა ანგარიშიდან?"
        confirmLabel="გამოსვლა"
        destructive
        icon="log-out-outline"
        onConfirm={() => { setLogoutConfirm(false); logout(); }}
        onCancel={() => setLogoutConfirm(false)}
      />
      <ConfirmModal
        visible={onboardingConfirm}
        title="ონბორდინგი"
        message="ნამდვილად გსურთ ხელახლა ნახვა? გადატვირთეთ აპლიკაცია შემდეგ."
        confirmLabel="დიახ, გადატვირთვა"
        icon="refresh-outline"
        onConfirm={async () => { setOnboardingConfirm(false); await AsyncStorage.removeItem('onboarding_done'); }}
        onCancel={() => setOnboardingConfirm(false)}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadStats(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >

        {/* ─── Header ─── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.85}>
            {avatarUri
              ? <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              : <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
            }
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name}{user?.lastName ? ` ${user.lastName}` : ''}</Text>
          <Text style={styles.contact}>{user?.phone || user?.email}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{bookingsCount}</Text>
              <Text style={styles.statLabel}>ჯავშანი</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{favoritesCount}</Text>
              <Text style={styles.statLabel}>ფავორიტი</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>შეფასება</Text>
            </View>
          </View>

          {/* Badge row */}
          <TouchableOpacity style={styles.badgeRow}>
            <Text style={styles.badgeEmojis}>🏅🥈🥉</Text>
            <Text style={styles.badgeRowLabel}>ბეჯები და მიღწევები</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ─── Manager banner (top, managers only) ─── */}
        {user?.role === 'restaurant_manager' && (
          <TouchableOpacity style={styles.managerBanner} onPress={() => navigation.navigate('Manager')} activeOpacity={0.85}>
            <View style={styles.managerBannerLeft}>
              <View style={styles.managerIconWrap}>
                <Ionicons name="business" size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.managerBannerTitle}>მენეჯერის პანელი</Text>
                <Text style={styles.managerBannerSub}>ჯავშნების მართვა · სტატისტიკა</Text>
              </View>
            </View>
            <View style={styles.managerBannerArrow}>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* ─── Section: ჩემი აქტივობა ─── */}
        <SectionHeader title="ჩემი აქტივობა" />
        <View style={styles.section}>
          <MenuRow
            icon="calendar-outline"
            label="ჯავშნები"
            badge={bookingsCount > 0 ? String(bookingsCount) : undefined}
            onPress={() => navigation.navigate('Main', { screen: 'Bookings' } as any)}
          />
          <MenuRow
            icon="star-outline"
            label="შეფასებები"
            onPress={() => {}}
          />
          <MenuRow
            icon="heart-outline"
            label="ფავორიტები"
            badge={favoritesCount > 0 ? String(favoritesCount) : undefined}
            onPress={() => navigation.navigate('Main', { screen: 'Favorites' } as any)}
            last
          />
        </View>

        {/* ─── Section: გადახდა (managers only) ─── */}
        {user?.role === 'restaurant_manager' && (
          <>
            <SectionHeader title="გამოწერა" />
            <View style={styles.section}>
              <MenuRow icon="card-outline" label="ყოველთვიური გამოწერა" onPress={() => navigation.navigate('Subscription')} last />
            </View>
          </>
        )}

        {/* ─── Section: ანგარიში ─── */}
        <SectionHeader title="ანგარიში" />
        <View style={styles.section}>
          <MenuRow
            icon="person-outline"
            label="პირადი ინფორმაცია"
            onPress={() => navigation.navigate('ProfileEdit')}
          />
          <MenuRow
            icon="refresh-outline"
            label="ონბორდინგის ხელახლა ნახვა"
            onPress={() => setOnboardingConfirm(true)}
            last
          />
        </View>

        {/* ─── Section: შეტყობინებები ─── */}
        <SectionHeader title="შეტყობინებები" />
        <View style={styles.section}>
          <View style={menuRowStyles.row}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: SPACING.md }} />
            <Text style={[menuRowStyles.label]}>შეტყობინებები</Text>
            <Switch
              value={notifEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '88' }}
              thumbColor={notifEnabled ? COLORS.primary : COLORS.textMuted}
            />
          </View>
        </View>

        {/* ─── Section: დახმარება ─── */}
        <SectionHeader title="დახმარება" />
        <View style={styles.section}>
          <MenuRow icon="help-circle-outline" label="მხარდაჭერა" onPress={() => {}} />
          <MenuRow icon="shield-checkmark-outline" label="კონფიდენციალობის პოლიტიკა" onPress={() => navigation.navigate('Privacy')} />
          <MenuRow icon="document-text-outline" label="გამოყენების პირობები" onPress={() => navigation.navigate('Terms')} />
          <MenuRow icon="information-circle-outline" label="აპლიკაციის შესახებ" onPress={() => navigation.navigate('About')} last />
        </View>

        {/* ─── Logout ─── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>გამოსვლა</Text>
        </TouchableOpacity>

        <Text style={styles.version}>ვერსია {APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={sectionHeaderStyle}>{title}</Text>;
}

const sectionHeaderStyle: import('react-native').TextStyle = {
  fontSize: 12,
  fontWeight: '700',
  color: COLORS.textMuted,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  marginTop: SPACING.lg,
  marginBottom: 4,
  paddingHorizontal: SPACING.md,
};

function MenuRow({
  icon, label, badge, onPress, loading, chevron, last,
}: {
  icon: string;
  label: string;
  badge?: string;
  onPress: () => void;
  loading?: boolean;
  chevron?: string;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[menuRowStyles.row, !last && menuRowStyles.border]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={20} color={COLORS.textSecondary} style={{ marginRight: SPACING.md }} />
      <Text style={menuRowStyles.label}>{label}</Text>
      {badge && (
        <View style={menuRowStyles.badge}>
          <Text style={menuRowStyles.badgeText}>{badge}</Text>
        </View>
      )}
      {loading
        ? <Ionicons name="sync" size={18} color={COLORS.textMuted} />
        : <Ionicons name={(chevron || 'chevron-forward') as any} size={18} color={COLORS.textMuted} />
      }
    </TouchableOpacity>
  );
}

const menuRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14, backgroundColor: COLORS.surface },
  border: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label: { flex: 1, fontSize: 15, color: COLORS.text },
  badge: { backgroundColor: COLORS.primary + '22', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2, marginRight: SPACING.sm },
  badgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // Guest
  guestContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  guestAvatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg, borderWidth: 2, borderColor: COLORS.border },
  guestTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  guestSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  guestBtn: { width: '100%', marginBottom: SPACING.md },
  guestRegLink: { fontSize: 14, color: COLORS.textSecondary },

  // Header
  header: { alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.xl, backgroundColor: COLORS.surface },
  avatarWrap: { marginBottom: SPACING.md, position: 'relative' },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: COLORS.primary },
  avatarText: { fontSize: 34, fontWeight: '800', color: '#fff' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.surface },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  contact: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.lg },

  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg, backgroundColor: COLORS.background, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, width: '100%' },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, height: 32, backgroundColor: COLORS.border },

  // Badge row
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: COLORS.background, borderRadius: RADIUS.md, width: '100%' },
  badgeEmojis: { fontSize: 20 },
  badgeRowLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },

  // Loyalty card
  managerBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: SPACING.md, marginTop: SPACING.md, borderRadius: RADIUS.xl, padding: SPACING.md, backgroundColor: COLORS.primary, elevation: 6, shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12 },
  managerBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  managerIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  managerBannerTitle: { fontSize: 16, fontWeight: '900', color: '#fff' },
  managerBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  managerBannerArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  loyaltyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: SPACING.md, marginTop: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  loyaltyLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  yumsBadge: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  yumsText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  yumsLabel: { fontSize: 9, fontWeight: '700', color: '#fff', marginTop: -2 },
  loyaltyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  loyaltySubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  // Referral card
  referralCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary + '12', marginHorizontal: SPACING.md, marginTop: SPACING.sm, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.primary + '33', gap: SPACING.md },
  referralBadge: { width: 52, height: 52, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  referralBadgeText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  referralBadgeLabel: { fontSize: 9, fontWeight: '700', color: '#fff', marginTop: -2 },
  referralTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  referralSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  // Section
  section: { marginHorizontal: SPACING.md, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },

  // Bookings
  bookingsList: { backgroundColor: COLORS.background, padding: SPACING.md },
  bookingCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  bookingName: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  bookingDate: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  bookingFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText: { fontSize: 12, fontWeight: '600' },
  cancelText: { fontSize: 13, color: COLORS.error, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, paddingVertical: SPACING.md },

  // Logout + version
  logoutBtn: { alignItems: 'center', marginTop: SPACING.xl, paddingVertical: SPACING.sm },
  logoutText: { fontSize: 15, color: COLORS.error, fontWeight: '700' },
  version: { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, marginTop: SPACING.md },
});
