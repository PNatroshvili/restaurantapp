import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View, Text, ScrollView, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Restaurant, Cuisine, RootStackParamList } from '../../types';
import { restaurantsApi, cuisinesApi } from '../../api/restaurants';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants';
import RestaurantCard from '../../components/restaurant/RestaurantCard';
import SignatureDishCard, { GEORGIAN_DISHES, SignatureDish } from '../../components/restaurant/SignatureDishCard';
import { SkeletonCard, SkeletonRestaurantRow } from '../../components/common/Skeleton';
import { useAuthStore } from '../../store/authStore';
import { getRecentlyViewed } from '../../services/recentlyViewed';

// ─── Helpers ───────────────────────────────────────────────────────────────

const CUISINE_ICONS: Record<string, string> = {
  'Georgian': '🫕', 'Italian': '🍕', 'Japanese': '🍣', 'Chinese': '🥢',
  'Fast Food': '🍔', 'Seafood': '🦞', 'Vegetarian': '🥗', 'Steakhouse': '🥩',
  'Coffee': '☕', 'Bakery': '🥐', 'Mexican': '🌮', 'Indian': '🍛',
};

const CUISINE_COLORS: Record<string, string> = {
  'Georgian': '#C0392B', 'Italian': '#E74C3C', 'Japanese': '#E91E8C',
  'Chinese': '#F39C12', 'Fast Food': '#E67E22', 'Seafood': '#2980B9',
  'Vegetarian': '#27AE60', 'Steakhouse': '#8E3A2A', 'Coffee': '#6D4C41',
  'Bakery': '#D4A017', 'Mexican': '#16A085', 'Indian': '#E53935',
};

const getDiscount = (id: string): number | null => {
  const pool = [null, null, null, 10, null, 20, null, null, 30, null, 15, null, null, 25, null];
  const idx = (id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % pool.length;
  return pool[idx];
};

const TODAY_CHIPS = ['დღეს', 'ხვალ', 'შაბ', 'კვი'];

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return { title: 'გვიანი ღამე', subtitle: 'ახლა ღია რესტორნები', emoji: '🌃' };
  if (h < 11) return { title: 'დილა მშვიდობისა', subtitle: 'საუზმე ან ყავა?', emoji: '☀️' };
  if (h < 15) return { title: 'გამარჯობა', subtitle: 'სადილი?', emoji: '🌤️' };
  if (h < 18) return { title: 'შუადღე', subtitle: 'ჩაი ან ყავა?', emoji: '🫖' };
  if (h < 23) return { title: 'საღამო მშვიდობისა', subtitle: 'ვახშამი?', emoji: '🌙' };
  return { title: 'გვიანი ვახშამი', subtitle: 'ახლა ღია', emoji: '⭐' };
}

// Curated collections — frontend-only, filter from existing data
const COLLECTIONS = [
  { id: 'romantic',  emoji: '💑',  title: 'წყვილებისთვის',  subtitle: 'რომანტიული ვახშამი',      accent: '#8B4FCE', bg: '#1A0D2D' },
  { id: 'family',    emoji: '👨‍👩‍👧', title: 'ოჯახური',        subtitle: 'ბავშვებისთვის',          accent: '#27AE60', bg: '#0D2018' },
  { id: 'premium',   emoji: '✨',   title: 'პრემიუმ',         subtitle: 'ლუქს გამოცდილება',        accent: '#F59E0B', bg: '#241800' },
  { id: 'quick',     emoji: '⚡',   title: 'სწრაფი',          subtitle: '30 წუთამდე',              accent: '#3B82F6', bg: '#0A1528' },
  { id: 'hidden',    emoji: '🗝️',  title: 'ფარული',          subtitle: 'ადგილობრივის საიდუმლო',   accent: '#EC4899', bg: '#1F0A1A' },
];

const georgiansFirst = (list: Restaurant[]) => [
  ...list.filter(r => r.cuisine?.name?.toLowerCase().includes('georgian') || r.cuisine?.slug?.includes('georgian')),
  ...list.filter(r => !r.cuisine?.name?.toLowerCase().includes('georgian') && !r.cuisine?.slug?.includes('georgian')),
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [popular, setPopular] = useState<Restaurant[]>([]);
  const [newest, setNewest] = useState<Restaurant[]>([]);
  const [nearby, setNearby] = useState<Restaurant[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [guests, setGuests] = useState(2);

  const greeting = getTimeGreeting();
  const pageAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pageAnim, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [popRes, newRes, cusRes] = await Promise.all([
        restaurantsApi.getAll({ limit: 12, city: 'თბილისი' }),
        restaurantsApi.getAll({ limit: 8, city: 'თბილისი' }),
        cuisinesApi.getAll(),
      ]);
      setPopular(popRes.data?.data || []);
      setNewest(newRes.data?.data || []);
      setCuisines(Array.isArray(cusRes.data) ? cusRes.data : []);
    } catch {}
    setLoading(false);
  };

  const loadNearby = async () => {
    setNearbyLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setNearbyLoading(false); return; }
      const last = await Location.getLastKnownPositionAsync();
      const loc = last ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const { latitude, longitude } = loc.coords;
      const res = await restaurantsApi.getAll({ city: 'თბილისი', limit: 50 });
      const all = res.data?.data || [];
      const withDist = all
        .map(r => {
          const dlat = Number(r.latitude) - latitude;
          const dlng = Number(r.longitude) - longitude;
          return { ...r, _dist: Math.sqrt(dlat * dlat + dlng * dlng) };
        })
        .sort((a, b) => a._dist - b._dist)
        .slice(0, 10);
      setNearby(withDist);
    } catch {}
    setNearbyLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), loadNearby()]);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
    loadNearby();
    getRecentlyViewed().then(setRecentlyViewed);
  }, []);

  const goToSearch = (params?: any) => navigation.navigate('Search', params);

  const withDiscounts = popular.filter(r => getDiscount(r.id) !== null);
  const trending = [...popular]
    .sort((a, b) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0))
    .slice(0, 10);
  const topRated = georgiansFirst(
    popular.filter(r => Number(r.ratingAvg) >= 4).slice(0, 10).length > 0
      ? popular.filter(r => Number(r.ratingAvg) >= 4).slice(0, 10)
      : popular.slice(0, 10)
  );

  const onDishPress = useCallback((dish: SignatureDish) => {
    const georgianCuisine = cuisines.find(c => c.slug === 'georgian' || c.name === 'ქართული');
    navigation.navigate('Search', {
      cuisineId: georgianCuisine?.id,
      cuisineName: georgianCuisine?.name ?? 'ქართული',
    });
  }, [navigation, cuisines]);

  const renderCard = useCallback(({ item }: { item: Restaurant }) => (
    <RestaurantCard restaurant={item} discount={getDiscount(item.id)} />
  ), []);

  const renderCuisineTile = useCallback(({ item }: { item: Cuisine }) => {
    const color = CUISINE_COLORS[item.name] || COLORS.primary;
    return (
      <TouchableOpacity
        style={styles.cuisineTile}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          goToSearch({ cuisineId: item.id, cuisineName: item.name });
        }}
        activeOpacity={0.82}
      >
        <View style={[styles.cuisineSquare, { backgroundColor: color + '22', borderColor: color + '44' }]}>
          <Text style={styles.cuisineIcon}>{item.icon || CUISINE_ICONS[item.name] || '🍴'}</Text>
        </View>
        <Text style={styles.cuisineName} numberOfLines={1}>{item.name}</Text>
      </TouchableOpacity>
    );
  }, [navigation]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >

        {/* ─── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.locationPill} onPress={loadNearby} activeOpacity={0.8}>
            <Ionicons name="location" size={13} color={COLORS.primary} />
            <Text style={styles.locationText}>თბილისი</Text>
            <Ionicons name="chevron-down" size={11} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            {isAuthenticated ? (
              <TouchableOpacity
                style={styles.avatarBtn}
                onPress={() => navigation.navigate('Main', { screen: 'Profile' } as any)}
              >
                <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginBtnText}>შესვლა</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ─── Content fade-in (everything below the header) ──────────── */}
        <Animated.View style={{
          opacity: pageAnim,
          transform: [{ translateY: pageAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }}>

        {/* ─── Greeting + Search ───────────────────────────────────────── */}
        <View style={styles.greetSection}>
          <Text style={styles.greetTitle}>{greeting.emoji} {greeting.title}</Text>
          <Text style={styles.greetSub}>{greeting.subtitle}</Text>
        </View>
        <TouchableOpacity style={styles.searchBar} onPress={() => goToSearch()} activeOpacity={0.85}>
          <Ionicons name="search" size={17} color={COLORS.primary} />
          <Text style={styles.searchPlaceholder}>რესტორანი, სამზარეულო...</Text>
          <View style={styles.searchDivider} />
          <View style={styles.filterBtn}>
            <Ionicons name="options-outline" size={15} color={COLORS.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* ─── Booking strip ───────────────────────────────────────────── */}
        <View style={styles.bookingStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: SPACING.md }}>
            {TODAY_CHIPS.map((d, i) => (
              <TouchableOpacity
                key={d}
                style={[styles.dayChip, selectedDay === i && styles.dayChipActive]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedDay(i); }}
              >
                <Text style={[styles.dayChipText, selectedDay === i && styles.dayChipTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.guestsChip}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGuests(g => Math.max(1, g - 1)); }}>
                <Ionicons name="remove" size={14} color={COLORS.text} />
              </TouchableOpacity>
              <Ionicons name="people-outline" size={13} color={COLORS.textSecondary} />
              <Text style={styles.guestsText}>{guests}</Text>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGuests(g => Math.min(20, g + 1)); }}>
                <Ionicons name="add" size={14} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* ─── Georgian Classics ───────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={sTitle.row}>
            <View>
              <Text style={[sTitle.text, { fontSize: 18 }]}>🇬🇪 ქართული კლასიკა</Text>
              <Text style={styles.sectionSub}>Must-try dishes for every visitor</Text>
            </View>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={GEORGIAN_DISHES}
            keyExtractor={d => d.key}
            contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.md }}
            renderItem={({ item }) => <SignatureDishCard dish={item} onPress={onDishPress} />}
          />
        </View>

        {/* ─── Cuisine categories ──────────────────────────────────────── */}
        {cuisines.length > 0 && (
          <View style={styles.section}>
            <SectionTitle title="სამზარეულო" onSeeAll={() => goToSearch()} />
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={cuisines}
              keyExtractor={(c) => c.id}
              contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.md }}
              renderItem={renderCuisineTile}
            />
          </View>
        )}

        {/* ─── Near you ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionTitle
            title="ახლომახლო"
            left={<RadarDot />}
            right={
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('Main', { screen: 'Map' } as any);
                }}
                style={styles.refreshBtn}
              >
                <Ionicons name="map-outline" size={13} color={COLORS.primary} />
                <Text style={styles.refreshBtnText}>რუქაზე ნახვა</Text>
              </TouchableOpacity>
            }
          />
          {nearbyLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginLeft: SPACING.md, marginTop: 8 }} />
          ) : nearby.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={nearby}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.md }}
              renderItem={renderCard}
            />
          ) : (
            <TouchableOpacity style={styles.nearPrompt} onPress={loadNearby} activeOpacity={0.8}>
              <View style={styles.nearIconWrap}>
                <Ionicons name="navigate-circle-outline" size={26} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.nearPromptTitle}>ახლომახლო რესტორნები</Text>
                <Text style={styles.nearPromptSub}>მდებარეობის წვდომა საჭიროა</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Last-minute deals ───────────────────────────────────────── */}
        {withDiscounts.length > 0 && (
          <View style={styles.section}>
            <View style={sTitle.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.urgentDot} />
                <Text style={sTitle.text}>ახლა დაჯავშნე</Text>
              </View>
              <TouchableOpacity onPress={() => goToSearch()} style={sTitle.seeAll}>
                <Text style={sTitle.seeAllText}>ყველა</Text>
                <Ionicons name="chevron-forward" size={13} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={withDiscounts.slice(0, 6)}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.md }}
              renderItem={({ item }) => (
                <RestaurantCard restaurant={item} discount={getDiscount(item.id)} tag="⚡ სპეციალური" />
              )}
            />
          </View>
        )}

        {/* ─── Top rated ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionTitle title="⭐ ტოპ რესტორნები" onSeeAll={() => goToSearch()} />
          {loading ? (
            <View style={{ flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.md }}>
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </View>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={topRated}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.md }}
              renderItem={renderCard}
            />
          )}
        </View>

        {/* ─── Trending now ────────────────────────────────────────────── */}
        {trending.length > 0 && (
          <View style={styles.section}>
            <SectionTitle title="📈 ტრენდი" onSeeAll={() => goToSearch()} />
            {loading ? (
              <View style={{ flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.md }}>
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </View>
            ) : (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={trending}
                keyExtractor={(r) => r.id}
                contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.md }}
                renderItem={({ item }) => (
                  <RestaurantCard restaurant={item} discount={getDiscount(item.id)} tag="🔥 ტრენდი" />
                )}
              />
            )}
          </View>
        )}

        {/* ─── Recently viewed ──────────────────────────────────────────── */}
        {recentlyViewed.length > 0 && (
          <View style={styles.section}>
            <SectionTitle title="🕐 ახლახანს ნანახი" />
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={recentlyViewed.slice(0, 10)}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.md }}
              renderItem={renderCard}
            />
          </View>
        )}

        {/* ─── New restaurants ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionTitle title="🆕 ახალი რესტორნები" onSeeAll={() => goToSearch()} />
          <View style={{ paddingHorizontal: SPACING.md, gap: SPACING.sm }}>
            {loading
              ? [1, 2, 3].map(i => <SkeletonRestaurantRow key={i} />)
              : georgiansFirst(newest).map((r, i) => (
                  <FadeSlideIn key={r.id} index={i}>
                    <RestaurantCard restaurant={r} horizontal discount={getDiscount(r.id)} />
                  </FadeSlideIn>
                ))
            }
          </View>
        </View>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function FadeSlideIn({ index, children }: { index: number; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 260, delay: Math.min(index * 40, 300),
      useNativeDriver: true, easing: Easing.out(Easing.quad),
    }).start();
  }, []);
  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
    }}>
      {children}
    </Animated.View>
  );
}

function RadarDot() {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = () => {
      ring1.setValue(0);
      ring2.setValue(0);
      Animated.parallel([
        Animated.timing(ring1, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 1, duration: 1500, delay: 550, useNativeDriver: true }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  return (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        position: 'absolute', width: 22, height: 22, borderRadius: 11,
        backgroundColor: COLORS.primary,
        opacity: ring1.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.55, 0.3, 0] }),
        transform: [{ scale: ring1.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] }) }],
      }} />
      <Animated.View style={{
        position: 'absolute', width: 22, height: 22, borderRadius: 11,
        backgroundColor: COLORS.primary,
        opacity: ring2.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.55, 0.3, 0] }),
        transform: [{ scale: ring2.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] }) }],
      }} />
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.primary }} />
    </View>
  );
}

function SectionTitle({ title, onSeeAll, right, left }: { title: string; onSeeAll?: () => void; right?: React.ReactNode; left?: React.ReactNode }) {
  return (
    <View style={sTitle.row}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {left}
        <Text style={sTitle.text}>{title}</Text>
      </View>
      {right || (onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={sTitle.seeAll}>
          <Text style={sTitle.seeAllText}>ყველა</Text>
          <Ionicons name="chevron-forward" size={13} color={COLORS.primary} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const sTitle = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  text: { fontSize: 17, fontFamily: FONTS.extraBold, color: COLORS.text },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 6,
    paddingBottom: 4,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  loginBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: 7, borderRadius: RADIUS.full },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Greeting
  greetSection: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  greetTitle: { fontSize: 22, fontFamily: FONTS.black, color: COLORS.text, letterSpacing: -0.3 },
  greetSub: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 50,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
  },
  searchPlaceholder: { flex: 1, color: COLORS.textMuted, fontSize: 14, fontWeight: '500' },
  searchDivider: { width: 1, height: 20, backgroundColor: COLORS.border },
  filterBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Booking strip
  bookingStrip: { marginBottom: SPACING.md },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  dayChipTextActive: { color: '#fff', fontWeight: '700' },
  guestsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  guestsText: { fontSize: 13, fontWeight: '700', color: COLORS.text, minWidth: 16, textAlign: 'center' },

  // Collections
  collectionCard: {
    width: 148,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    gap: 3,
  },
  collectionEmoji: { fontSize: 26, marginBottom: 4 },
  collectionTitle: { fontSize: 13, fontWeight: '800' },
  collectionSub: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '500', lineHeight: 14 },
  collectionArrow: {
    alignSelf: 'flex-start',
    marginTop: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Cuisine tiles
  cuisineTile: { alignItems: 'center', width: 72 },
  cuisineSquare: {
    width: 58,
    height: 58,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 6,
  },
  cuisineIcon: { fontSize: 26 },
  cuisineName: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', textAlign: 'center' },

  // Last-minute / urgent
  urgentDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },

  // Near you
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refreshBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  nearPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginHorizontal: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nearIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearPromptTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  nearPromptSub: { fontSize: 12, color: COLORS.textSecondary },

  // Generic section
  section: { marginBottom: SPACING.lg },
  sectionSub: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500', marginTop: 1 },
});
