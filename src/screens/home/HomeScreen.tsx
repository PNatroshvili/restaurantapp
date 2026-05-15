import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Restaurant, Cuisine, RootStackParamList } from '../../types';
import { restaurantsApi, cuisinesApi } from '../../api/restaurants';
import { COLORS, SPACING, RADIUS } from '../../constants';
import RestaurantCard from '../../components/restaurant/RestaurantCard';
import SignatureDishCard, { GEORGIAN_DISHES, SignatureDish } from '../../components/restaurant/SignatureDishCard';
import { SkeletonCard, SkeletonRestaurantRow } from '../../components/common/Skeleton';
import { useAuthStore } from '../../store/authStore';

const CUISINE_ICONS: Record<string, string> = {
  'Georgian': '🫕', 'Italian': '🍕', 'Japanese': '🍣', 'Chinese': '🥢',
  'Fast Food': '🍔', 'Seafood': '🦞', 'Vegetarian': '🥗', 'Steakhouse': '🥩',
  'Coffee': '☕', 'Bakery': '🥐', 'Mexican': '🌮', 'Indian': '🍛',
};

const getDiscount = (id: string): number | null => {
  const pool = [null, null, null, 10, null, 20, null, null, 30, null, 15, null, null, 25, null];
  const idx = (id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % pool.length;
  return pool[idx];
};

const TODAY_CHIPS = ['დღეს', 'ხვალ', 'შაბ', 'კვი'];

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [popular, setPopular] = useState<Restaurant[]>([]);
  const [newest, setNewest] = useState<Restaurant[]>([]);
  const [nearby, setNearby] = useState<Restaurant[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [guests, setGuests] = useState(2);

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

  const onRefresh = async () => { setRefreshing(true); await Promise.all([load(), loadNearby()]); setRefreshing(false); };

  useEffect(() => { load(); loadNearby(); }, []);

  const goToSearch = () => {
    navigation.navigate('Search');
  };

  const withDiscounts = popular.filter(r => getDiscount(r.id) !== null);

  // Georgian restaurants get priority in all sorted lists
  const georgiansFirst = (list: Restaurant[]) => [
    ...list.filter(r => r.cuisine?.name?.toLowerCase().includes('georgian') || r.cuisine?.slug?.includes('georgian')),
    ...list.filter(r => !r.cuisine?.name?.toLowerCase().includes('georgian') && !r.cuisine?.slug?.includes('georgian')),
  ];

  const onDishPress = (dish: SignatureDish) => {
    navigation.navigate('Search', { cuisineId: undefined, cuisineName: undefined, dishQuery: dish.searchQuery } as any);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >

        {/* ─── Header ─── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.locationPill} onPress={loadNearby}>
            <Ionicons name="location" size={14} color={COLORS.primary} />
            <Text style={styles.locationText}>თბილისი</Text>
            <Ionicons name="chevron-down" size={12} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            {isAuthenticated ? (
              <TouchableOpacity style={styles.avatarSmall} onPress={() => navigation.navigate('Main', { screen: 'Profile' } as any)}>
                <Text style={styles.avatarSmallText}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginBtnText}>შესვლა</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ─── Search bar ─── */}
        <TouchableOpacity style={styles.searchBar} onPress={() => goToSearch()} activeOpacity={0.85}>
          <Ionicons name="search" size={18} color={COLORS.primary} />
          <Text style={styles.searchPlaceholder}>რესტორანი, სამზარეულო...</Text>
          <View style={styles.searchDivider} />
          <Ionicons name="options-outline" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* ─── Booking strip ─── */}
        <View style={styles.bookingStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: SPACING.md }}>
            {TODAY_CHIPS.map((d, i) => (
              <TouchableOpacity
                key={d}
                style={[styles.dayChip, selectedDay === i && styles.dayChipActive]}
                onPress={() => setSelectedDay(i)}
              >
                <Text style={[styles.dayChipText, selectedDay === i && styles.dayChipTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.guestsChip}>
              <TouchableOpacity onPress={() => setGuests(g => Math.max(1, g - 1))}>
                <Ionicons name="remove" size={14} color={COLORS.text} />
              </TouchableOpacity>
              <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.guestsText}>{guests}</Text>
              <TouchableOpacity onPress={() => setGuests(g => Math.min(20, g + 1))}>
                <Ionicons name="add" size={14} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* ─── 🇬🇪 Signature Georgian Dishes ─── */}
        <View style={styles.section}>
          <View style={sTitle.row}>
            <View>
              <Text style={[sTitle.text, { fontSize: 18 }]}>🇬🇪 ქართული კლასიკა</Text>
              <Text style={styles.dishSubtitle}>Must-try dishes for every visitor</Text>
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

        {/* ─── Hero banner ─── */}
        <TouchableOpacity style={styles.heroBanner} onPress={() => goToSearch()} activeOpacity={0.9}>
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>ახალი</Text>
            </View>
            <Text style={styles.heroTitle}>იპოვე სასადილო{'\n'}დღეს ღამით</Text>
            <Text style={styles.heroSub}>{popular.length}+ რესტორანი თბილისში</Text>
            <View style={styles.heroCta}>
              <Text style={styles.heroCtaText}>ნახე ყველა</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
            </View>
          </View>
          <View style={styles.heroEmoji}>
            <Text style={{ fontSize: 64 }}>🍽️</Text>
          </View>
        </TouchableOpacity>

        {/* ─── Cuisine categories ─── */}
        {cuisines.length > 0 && (
          <View style={styles.section}>
            <SectionTitle title="კატეგორიები" onSeeAll={() => goToSearch()} />
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={cuisines}
              keyExtractor={(c) => c.id}
              contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.md }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.cuisineTile}
                  onPress={() => navigation.navigate('Search', { cuisineId: item.id, cuisineName: item.name })}
                >
                  <View style={styles.cuisineCircle}>
                    <Text style={styles.cuisineIcon}>{item.icon || CUISINE_ICONS[item.name] || '🍴'}</Text>
                  </View>
                  <Text style={styles.cuisineName} numberOfLines={1}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* ─── Near you ─── */}
        <View style={styles.section}>
          <SectionTitle
            title="ახლომახლო"
            right={
              <TouchableOpacity onPress={loadNearby} style={styles.refreshBtn}>
                <Ionicons name="navigate-outline" size={14} color={COLORS.primary} />
                <Text style={styles.refreshBtnText}>განახლება</Text>
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
              renderItem={({ item }) => <RestaurantCard restaurant={item} discount={getDiscount(item.id)} />}
            />
          ) : (
            <TouchableOpacity style={styles.nearPrompt} onPress={loadNearby}>
              <Ionicons name="navigate-circle-outline" size={28} color={COLORS.primary} />
              <View>
                <Text style={styles.nearPromptTitle}>ახლომახლო რესტორნები</Text>
                <Text style={styles.nearPromptSub}>მდებარეობის წვდომა საჭიროა</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Special offers ─── */}
        <View style={styles.section}>
          <SectionTitle title="🔥 სპეციალური შეთავაზებები" onSeeAll={() => goToSearch()} />
          {loading ? (
            <View style={{ flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.md }}>
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </View>
          ) : withDiscounts.length > 0 ? (
            <FlatList
              horizontal showsHorizontalScrollIndicator={false}
              data={withDiscounts.slice(0, 8)}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.md }}
              renderItem={({ item }) => <RestaurantCard restaurant={item} discount={getDiscount(item.id)} />}
            />
          ) : null}
        </View>

        {/* ─── Top rated ─── */}
        <View style={styles.section}>
          <SectionTitle title="⭐ ტოპ რესტორნები" onSeeAll={() => goToSearch()} />
          {loading ? (
            <View style={{ flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.md }}>
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </View>
          ) : (
            <FlatList
              horizontal showsHorizontalScrollIndicator={false}
              data={georgiansFirst(
                popular.filter(r => Number(r.ratingAvg) >= 4).slice(0, 10).length > 0
                  ? popular.filter(r => Number(r.ratingAvg) >= 4).slice(0, 10)
                  : popular.slice(0, 10)
              )}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.md }}
              renderItem={({ item }) => <RestaurantCard restaurant={item} discount={getDiscount(item.id)} />}
            />
          )}
        </View>

        {/* ─── New restaurants ─── */}
        <View style={styles.section}>
          <SectionTitle title="🆕 ახალი რესტორნები" onSeeAll={() => goToSearch()} />
          <View style={{ paddingHorizontal: SPACING.md, gap: SPACING.sm }}>
            {loading
              ? [1, 2, 3].map(i => <SkeletonRestaurantRow key={i} />)
              : georgiansFirst(newest).map((r) => <RestaurantCard key={r.id} restaurant={r} horizontal discount={getDiscount(r.id)} />)
            }
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title, onSeeAll, right }: { title: string; onSeeAll?: () => void; right?: React.ReactNode }) {
  return (
    <View style={sTitle.row}>
      <Text style={sTitle.text}>{title}</Text>
      {right || (onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={sTitle.seeAll}>
          <Text style={sTitle.seeAllText}>ყველა</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const sTitle = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  text: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  locationPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  locationText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatarSmall: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarSmallText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  loginBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: 7, borderRadius: RADIUS.full },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, height: 50, borderWidth: 1.5, borderColor: COLORS.primary + '55' },
  searchPlaceholder: { flex: 1, color: COLORS.textMuted, fontSize: 14 },
  searchDivider: { width: 1, height: 20, backgroundColor: COLORS.border },

  // Booking strip
  bookingStrip: { marginBottom: SPACING.md },
  dayChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  dayChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  dayChipTextActive: { color: '#fff' },
  guestsChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  guestsText: { fontSize: 13, fontWeight: '700', color: COLORS.text, minWidth: 16, textAlign: 'center' },

  // Hero
  heroBanner: { marginHorizontal: SPACING.md, marginBottom: SPACING.lg, borderRadius: RADIUS.xl, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', overflow: 'hidden', padding: SPACING.md },
  heroContent: { flex: 1 },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.full, marginBottom: SPACING.sm },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  heroTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, lineHeight: 24, marginBottom: 6 },
  heroSub: { fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroCtaText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  heroEmoji: { justifyContent: 'center', alignItems: 'center', paddingLeft: SPACING.sm },

  // Sections
  section: { marginBottom: SPACING.lg },
  dishSubtitle: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500', marginTop: 1 },

  // Cuisines
  cuisineTile: { alignItems: 'center', width: 72 },
  cuisineCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, marginBottom: 6 },
  cuisineIcon: { fontSize: 28 },
  cuisineName: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', textAlign: 'center' },

  // Nearby
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refreshBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  nearPrompt: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginHorizontal: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  nearPromptTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  nearPromptSub: { fontSize: 12, color: COLORS.textSecondary },
});
