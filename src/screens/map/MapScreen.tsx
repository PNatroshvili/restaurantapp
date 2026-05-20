import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Text, ActivityIndicator,
  Animated, ScrollView, FlatList, Image, Dimensions, Modal, Switch,
  SafeAreaView as RNSafeAreaView,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import RestaurantMap from '../../components/map/RestaurantMap';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Restaurant, Cuisine, RootStackParamList, MainTabParamList } from '../../types';
import { restaurantsApi, cuisinesApi } from '../../api/restaurants';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants';

// ─── Constants ─────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 64;
const CARD_GAP = 16;
const CARD_H = 152;
const BOTTOM_BAR_H = CARD_H + 28;

const TBILISI: Region = { latitude: 41.6938, longitude: 44.8015, latitudeDelta: 0.08, longitudeDelta: 0.08 };

const CUISINE_ICONS: Record<string, string> = {
  'Georgian': '🫕', 'Italian': '🍕', 'Japanese': '🍣', 'Chinese': '🥢',
  'Fast Food': '🍔', 'Seafood': '🦞', 'Vegetarian': '🥗', 'Steakhouse': '🥩',
  'Coffee': '☕', 'Bakery': '🥐', 'Mexican': '🌮', 'Indian': '🍛',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const scoreColor = (rating: number) =>
  rating >= 4.5 ? '#00C896' : rating >= 3.5 ? '#F59E0B' : COLORS.textMuted;

const getDiscount = (id: string): number | null => {
  const pool = [null, null, null, 10, null, 20, null, null, 30, null, 15, null, null, 25, null];
  return pool[(id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % pool.length];
};

const coverOf = (r: Restaurant) =>
  r.cover_photo || r.coverPhoto || r.photos?.find(p => p.isCover)?.url || r.photos?.[0]?.url || null;

// Haversine great-circle distance in metres
function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (d: number) => d * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} მ`;
  const km = metres / 1000;
  return km < 10 ? `${km.toFixed(1)} კმ` : `${Math.round(km)} კმ`;
}

// ─── MapCard ───────────────────────────────────────────────────────────────

function MapCard({
  restaurant: r,
  isSelected,
  onSelect,
  onBook,
  navigation,
  distance,
}: {
  restaurant: Restaurant;
  isSelected: boolean;
  onSelect: () => void;
  onBook: () => void;
  navigation: NativeStackNavigationProp<RootStackParamList>;
  distance: number | null;
}) {
  const cover = coverOf(r);
  const rating = Number(r.ratingAvg);
  const discount = getDiscount(r.id);
  const sc = scoreColor(rating);

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={() => navigation.navigate('RestaurantDetail', { id: r.id })}
      activeOpacity={0.92}
    >
      {/* Photo */}
      {cover
        ? <Image source={{ uri: cover }} style={styles.cardImg} resizeMode="cover" />
        : <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
            <Ionicons name="restaurant" size={28} color={COLORS.textMuted} />
          </View>
      }

      {/* Body */}
      <View style={styles.cardBody}>
        {/* Name row + rating badge */}
        <View style={styles.cardTopRow}>
          <Text style={styles.cardName} numberOfLines={1}>{r.name}</Text>
          {rating > 0 && (
            <View style={[styles.cardRatingBadge, { backgroundColor: sc }]}>
              <Text style={styles.cardRatingText}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Cuisine + district */}
        <Text style={styles.cardMeta} numberOfLines={1}>
          {r.cuisine?.icon ? `${r.cuisine.icon} ` : ''}
          {r.cuisine?.name || ''}
          {r.district ? ` · ${r.district}` : r.address ? ` · ${r.address.split(',')[0]}` : ''}
        </Text>

        {/* Distance from user */}
        {distance !== null && (
          <View style={styles.cardDistRow}>
            <Ionicons name="navigate-outline" size={11} color={COLORS.primary} />
            <Text style={styles.cardDistText}>{formatDistance(distance)}</Text>
          </View>
        )}

        {/* Discount badge */}
        {discount !== null && (
          <View style={styles.cardDiscountBadge}>
            <Text style={styles.cardDiscountText}>-{discount}% ფასდაკლება</Text>
          </View>
        )}

        {/* Spacer pushes buttons to bottom */}
        <View style={{ flex: 1 }} />

        {/* Action buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.cardInfoBtn}
            onPress={() => navigation.navigate('RestaurantDetail', { id: r.id })}
          >
            <Text style={styles.cardInfoText}>ინფო</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardBookBtn} onPress={onBook}>
            <Ionicons name="calendar-outline" size={13} color="#fff" />
            <Text style={styles.cardBookText}>ჯავშნა</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}


// ─── Filter Modal ──────────────────────────────────────────────────────────

function MapFilterModal({
  visible, onClose, onClear,
  filterOpen, setFilterOpen,
  filterRating, setFilterRating,
  filterCuisines, setFilterCuisines,
  cuisines, resultCount,
}: {
  visible: boolean; onClose: () => void; onClear: () => void;
  filterOpen: boolean; setFilterOpen: (v: boolean) => void;
  filterRating: 4 | 4.5 | null; setFilterRating: (v: 4 | 4.5 | null) => void;
  filterCuisines: string[]; setFilterCuisines: (v: string[]) => void;
  cuisines: Cuisine[]; resultCount: number;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <RNSafeAreaView style={fm.root}>
        {/* Header */}
        <View style={fm.header}>
          <TouchableOpacity onPress={onClose} style={fm.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={fm.title}>ფილტრები</Text>
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={fm.clearAll}>გასუფთავება</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={fm.scroll} showsVerticalScrollIndicator={false}>
          {/* Open Now */}
          <View style={fm.section}>
            <View style={fm.rowBetween}>
              <Text style={fm.sectionTitle}>ახლა ღია</Text>
              <Switch
                value={filterOpen}
                onValueChange={setFilterOpen}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
          <View style={fm.divider} />

          {/* Rating */}
          <View style={fm.section}>
            <View style={fm.sectionHead}>
              <Text style={fm.sectionTitle}>შეფასება</Text>
              <View style={fm.badge}>
                <Text style={fm.badgeText}>{filterRating ? `${filterRating}★+` : 'ყველა'}</Text>
              </View>
            </View>
            <View style={fm.chipRow}>
              {([null, 4, 4.5] as const).map(r => (
                <TouchableOpacity
                  key={String(r)}
                  style={[fm.ratingChip, filterRating === r && fm.ratingChipOn]}
                  onPress={() => setFilterRating(r)}
                >
                  <Text style={[fm.ratingChipTxt, filterRating === r && fm.ratingChipTxtOn]}>
                    {r === null ? 'ყველა' : `${r}★+`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={fm.divider} />

          {/* Cuisine */}
          <View style={fm.section}>
            <View style={fm.sectionHead}>
              <Ionicons name="restaurant-outline" size={18} color={COLORS.text} />
              <Text style={[fm.sectionTitle, { marginLeft: 8 }]}>სამზარეულო</Text>
              <View style={fm.badge}>
                <Text style={fm.badgeText}>
                  {filterCuisines.length > 0 ? `${filterCuisines.length} არჩეული` : 'ყველა'}
                </Text>
              </View>
            </View>
            {cuisines.map((c, i) => (
              <TouchableOpacity
                key={c.id}
                style={[fm.cuisineRow, i === cuisines.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => setFilterCuisines(
                  filterCuisines.includes(c.id)
                    ? filterCuisines.filter(id => id !== c.id)
                    : [...filterCuisines, c.id]
                )}
                activeOpacity={0.7}
              >
                <Text style={fm.cuisineName}>{c.icon ? `${c.icon}  ` : ''}{c.name}</Text>
                <View style={[fm.checkbox, filterCuisines.includes(c.id) && fm.checkboxOn]}>
                  {filterCuisines.includes(c.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Apply button */}
        <TouchableOpacity style={fm.applyBtn} onPress={onClose} activeOpacity={0.85}>
          <Text style={fm.applyTxt}>{resultCount} რესტორანი ნახვა</Text>
        </TouchableOpacity>
      </RNSafeAreaView>
    </Modal>
  );
}

const fm = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  closeBtn: { padding: 4 },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.text },
  clearAll: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 20, paddingVertical: 22 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  badge: {
    marginLeft: 10, backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.border,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  divider: { height: 1, backgroundColor: COLORS.border },
  chipRow: { flexDirection: 'row', gap: 10 },
  ratingChip: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  ratingChipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  ratingChipTxt: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  ratingChipTxtOn: { color: '#fff' },
  cuisineRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border + '55',
  },
  cuisineName: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  checkbox: {
    width: 22, height: 22, borderRadius: 5,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  applyBtn: {
    margin: 16, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8,
  },
  applyTxt: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
});

// ─── Component ─────────────────────────────────────────────────────────────

export default function MapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'Map'>>();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const listRef = useRef<FlatList>(null);
  const searchHereAnim = useRef(new Animated.Value(0)).current;
  const bottomBarAnim = useRef(new Animated.Value(0)).current;
  const bottomBarShown = useRef(false);
  const suppressSearchHere = useRef(false);
  const suppressCardScroll = useRef(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [locating, setLocating] = useState(false);

  // Filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterRating, setFilterRating] = useState<4 | 4.5 | null>(null);
  const [filterCuisines, setFilterCuisines] = useState<string[]>([]);
  const [sortNearest, setSortNearest] = useState(false);

  // Location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [region, setRegion] = useState<Region>(TBILISI);
  const [startRegion, setStartRegion] = useState<Region | null>(null);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const [areaFilter, setAreaFilter] = useState<Region | null>(null);
  const initialZoomDone = useRef(false);

  // ── Apply incoming params from Search screen ──────────────────────────
  useEffect(() => {
    const p = route.params;
    if (!p) return;
    if (p.cuisineId) setFilterCuisines([p.cuisineId]);
    if (p.filterOpen) setFilterOpen(true);
    if (p.filterRating) setFilterRating(p.filterRating);
    if (p.sortNearest) setSortNearest(true);
    if (p.userLat && p.userLng) {
      setUserLocation({ lat: p.userLat, lng: p.userLng });
      suppressSearchHere.current = true;
    }
  }, [route.params]);

  // ── Resolve initial map region (runs before map renders) ──────────────
  // Uses last known position (instant cache read) so the map opens already
  // centered on the user's nearby area with no Tbilisi→user animation.
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const last = await Location.getLastKnownPositionAsync();
          if (last) {
            const { latitude, longitude } = last.coords;
            setUserLocation({ lat: latitude, lng: longitude });
            initialZoomDone.current = true;
            setStartRegion({ latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
            return;
          }
        }
      } catch {}
      // No cached position — fall back to city view
      setStartRegion(TBILISI);
    })();
  }, []);

  // ── Get accurate GPS fix ───────────────────────────────────────────────
  // Updates userLocation for routing/sorting. If no last-known position was
  // available (map started at Tbilisi), also zooms to user location.
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        if (!initialZoomDone.current) {
          initialZoomDone.current = true;
          suppressSearchHere.current = true;
          setTimeout(() => {
            mapRef.current?.animateToRegion(
              { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
              700,
            );
          }, 300);
        }
      } catch {}
    })();
  }, []);

  // ── Load data ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [restRes, cusRes] = await Promise.allSettled([
          restaurantsApi.getAll({ city: 'თბილისი', limit: 2000 }),
          cuisinesApi.getAll(),
        ]);
        if (restRes.status === 'fulfilled') setRestaurants(restRes.value.data?.data || []);
        if (cusRes.status === 'fulfilled') {
          const raw: Cuisine[] = Array.isArray(cusRes.value.data) ? cusRes.value.data : [];
          setCuisines(raw.sort((a, b) => {
            const aGeo = a.name?.toLowerCase().includes('ქართ') ? -1 : 0;
            const bGeo = b.name?.toLowerCase().includes('ქართ') ? -1 : 0;
            return aGeo - bGeo;
          }));
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  // ── Search-here animation ──────────────────────────────────────────────
  useEffect(() => {
    Animated.spring(searchHereAnim, {
      toValue: showSearchHere ? 1 : 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 4,
    }).start();
  }, [showSearchHere]);

  // ── Filtering ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => restaurants.filter(r => {
    if (!r.latitude || !r.longitude) return false;
    if (filterOpen && !r.isOpen) return false;
    if (filterRating && Number(r.ratingAvg) < filterRating) return false;
    if (filterCuisines.length > 0 && !filterCuisines.includes(r.cuisine?.id ?? '') && !filterCuisines.includes((r as any).cuisineId)) return false;
    if (areaFilter) {
      const lat = Number(r.latitude), lng = Number(r.longitude);
      if (lat < areaFilter.latitude - areaFilter.latitudeDelta / 2) return false;
      if (lat > areaFilter.latitude + areaFilter.latitudeDelta / 2) return false;
      if (lng < areaFilter.longitude - areaFilter.longitudeDelta / 2) return false;
      if (lng > areaFilter.longitude + areaFilter.longitudeDelta / 2) return false;
    }
    return true;
  }), [restaurants, filterOpen, filterRating, filterCuisines, areaFilter]);

  const sortedFiltered = useMemo(() => {
    if (!sortNearest || !userLocation) return filtered;
    const byDistance = [...filtered].sort((a, b) =>
      Math.hypot(Number(a.latitude) - userLocation.lat, Number(a.longitude) - userLocation.lng) -
      Math.hypot(Number(b.latitude) - userLocation.lat, Number(b.longitude) - userLocation.lng)
    );
    return byDistance.slice(0, 25);
  }, [filtered, sortNearest, userLocation]);

  // Reset list scroll when results change
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setSelected(null);
  }, [sortedFiltered.length, filterCuisines.length, filterOpen, filterRating, areaFilter]);

  // ── Fit map to Near Me results ─────────────────────────────────────────
  const fittedRef = useRef(false);
  useEffect(() => {
    if (!sortNearest || !userLocation || sortedFiltered.length === 0 || fittedRef.current) return;
    fittedRef.current = true;
    const coords = [
      { latitude: userLocation.lat, longitude: userLocation.lng },
      ...sortedFiltered.map(r => ({ latitude: Number(r.latitude), longitude: Number(r.longitude) })),
    ];
    suppressSearchHere.current = true;
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 140, right: 40, bottom: BOTTOM_BAR_H + insets.bottom + 40, left: 40 },
        animated: true,
      });
    }, 500);
  }, [sortNearest, userLocation, sortedFiltered]);

  useEffect(() => { if (!sortNearest) fittedRef.current = false; }, [sortNearest]);

  const activeFilterCount = [filterOpen, filterRating !== null, filterCuisines.length > 0, sortNearest, areaFilter !== null].filter(Boolean).length;

  // ── Handlers ──────────────────────────────────────────────────────────
  const selectRestaurant = useCallback((r: Restaurant) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(r);
    setShowSearchHere(false);
    const idx = sortedFiltered.findIndex(x => x.id === r.id);
    if (idx >= 0) {
      suppressCardScroll.current = true;
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: idx * (CARD_W + CARD_GAP), animated: true });
      }, 80);
    }
  }, [sortedFiltered]);

  const onCardScrollEnd = useCallback((e: any) => {
    if (suppressCardScroll.current) { suppressCardScroll.current = false; return; }
    const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + CARD_GAP));
    const r = sortedFiltered[Math.max(0, Math.min(idx, sortedFiltered.length - 1))];
    if (!r) return;
    setSelected(r);
    suppressSearchHere.current = true;
    mapRef.current?.animateToRegion({
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    }, 350);
  }, [sortedFiltered]);

  const handleBook = useCallback((r: Restaurant) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Booking', { restaurantId: r.id, restaurantName: r.name });
  }, [navigation]);

  const goToMyLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      suppressSearchHere.current = true;
      mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600);
      setSelected(null);
      setShowSearchHere(false);
    } catch {}
    setLocating(false);
  }, []);

  const onMapRegionChange = useCallback((r: Region) => {
    Haptics.selectionAsync();
    setRegion(r);
    if (!suppressSearchHere.current) setShowSearchHere(true);
    suppressSearchHere.current = false;
  }, []);

  const searchThisArea = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAreaFilter(region);
    setShowSearchHere(false);
    setSelected(null);
  }, [region]);

  const clearFilters = () => {
    setFilterOpen(false); setFilterRating(null); setFilterCuisines([]);
    setSortNearest(false); setAreaFilter(null); setShowSearchHere(false);
  };

  // ── Card entrance animation ───────────────────────────────────────────
  useEffect(() => {
    if (!loading && sortedFiltered.length > 0 && !bottomBarShown.current) {
      bottomBarShown.current = true;
      Animated.spring(bottomBarAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 5 }).start();
    }
  }, [loading, sortedFiltered.length]);

  const surpriseMe = useCallback(() => {
    if (sortedFiltered.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const r = sortedFiltered[Math.floor(Math.random() * sortedFiltered.length)];
    selectRestaurant(r);
    suppressSearchHere.current = true;
    mapRef.current?.animateToRegion(
      { latitude: Number(r.latitude), longitude: Number(r.longitude), latitudeDelta: 0.008, longitudeDelta: 0.008 },
      500,
    );
  }, [sortedFiltered, selectRestaurant]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {startRegion && (
        <RestaurantMap
          mapRef={mapRef}
          restaurants={sortedFiltered}
          selectedRestaurantId={selected?.id ?? null}
          onRestaurantPress={selectRestaurant}
          initialRegion={startRegion}
          userLocation={userLocation}
          onRegionChangeComplete={onMapRegionChange}
          onPress={() => setShowSearchHere(false)}
        />
      )}

      {(loading || !startRegion) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      )}

      {/* ── HEADER ── */}
      <SafeAreaView style={styles.header} edges={['top']} onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.85}
        >
          <Ionicons name="search" size={16} color={COLORS.primary} />
          <Text style={styles.searchPlaceholder}>რესტორანი, სამზარეულო...</Text>
          <View style={styles.searchDivider} />
          <Ionicons name="options-outline" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.filterRow}>
          {/* Filters button — opens modal */}
          <TouchableOpacity
            style={[styles.chip, styles.chipFilters, activeFilterCount > 0 && styles.chipActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilterModalOpen(true); }}
          >
            <Ionicons name="options-outline" size={13} color={activeFilterCount > 0 ? '#fff' : COLORS.textSecondary} />
            <Text style={[styles.chipText, activeFilterCount > 0 && styles.chipTextActive]}>ფილტრები</Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Open Now — quick toggle */}
          <TouchableOpacity
            style={[styles.chip, filterOpen && styles.chipActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilterOpen(s => !s); }}
          >
            <View style={[styles.dot, { backgroundColor: filterOpen ? '#fff' : '#22C55E' }]} />
            <Text style={[styles.chipText, filterOpen && styles.chipTextActive]}>ღია</Text>
          </TouchableOpacity>

          {/* Near Me — quick toggle */}
          <TouchableOpacity
            style={[styles.chip, sortNearest && styles.chipActive]}
            onPress={() => { setSortNearest(s => !s); if (!sortNearest) goToMyLocation(); }}
          >
            <Ionicons name="navigate-outline" size={11} color={sortNearest ? '#fff' : COLORS.primary} />
            <Text style={[styles.chipText, sortNearest && styles.chipTextActive]}>ახლომახლო</Text>
          </TouchableOpacity>

          {/* Active cuisine count tag */}
          {filterCuisines.length > 0 && (
            <TouchableOpacity
              style={[styles.chip, styles.chipActive]}
              onPress={() => setFilterCuisines([])}
            >
              <Text style={[styles.chipText, styles.chipTextActive]}>
                სამზარ. {filterCuisines.length}
              </Text>
              <Ionicons name="close" size={11} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Clear all */}
          {activeFilterCount > 0 && (
            <TouchableOpacity style={[styles.chip, styles.chipClear]} onPress={clearFilters}>
              <Ionicons name="close-circle" size={13} color={COLORS.error} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.subRow}>
          <View style={styles.countChip}>
            <Ionicons name="restaurant-outline" size={12} color={COLORS.primary} />
            <Text style={styles.countText}>{sortedFiltered.length} რესტორანი</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.surpriseBtn} onPress={surpriseMe}>
              <Text style={styles.surpriseBtnText}>🎲 გაგიკვირდება</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.locBtn} onPress={goToMyLocation}>
              {locating
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Ionicons name="navigate-outline" size={18} color={COLORS.primary} />}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* ── SEARCH THIS AREA button ── */}
      <Animated.View
        style={[
          styles.searchHereWrap,
          {
            top: headerHeight + 10,
            opacity: searchHereAnim,
            transform: [{ translateY: searchHereAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
          },
        ]}
        pointerEvents={showSearchHere ? 'auto' : 'none'}
      >
        <TouchableOpacity style={styles.searchHereBtn} onPress={searchThisArea} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={14} color="#222" />
          <Text style={styles.searchHereText}>ამ ზონაში ძიება</Text>
          {areaFilter && (
            <TouchableOpacity
              style={styles.searchHereClear}
              onPress={() => { setAreaFilter(null); setShowSearchHere(false); }}
            >
              <Ionicons name="close" size={11} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ── BOTTOM SWIPEABLE CARDS ── */}
      {!loading && sortedFiltered.length > 0 && (
        <Animated.View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }, {
          opacity: bottomBarAnim,
          transform: [{ translateY: bottomBarAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
        }]}>
          <FlatList
            ref={listRef}
            data={sortedFiltered}
            keyExtractor={r => r.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_W + CARD_GAP}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 16 }}
            ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
            onMomentumScrollEnd={onCardScrollEnd}
            onScrollToIndexFailed={({ index }) => {
              listRef.current?.scrollToOffset({ offset: index * (CARD_W + CARD_GAP), animated: false });
            }}
            renderItem={({ item }) => {
              const dist = userLocation
                ? distanceMetres(
                    userLocation.lat, userLocation.lng,
                    Number(item.latitude), Number(item.longitude),
                  )
                : null;
              return (
                <MapCard
                  restaurant={item}
                  isSelected={selected?.id === item.id}
                  onSelect={() => selectRestaurant(item)}
                  onBook={() => handleBook(item)}
                  navigation={navigation}
                  distance={dist}
                />
              );
            }}
          />
        </Animated.View>
      )}

      {/* ── FILTER MODAL ── */}
      <MapFilterModal
        visible={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onClear={() => { clearFilters(); setFilterModalOpen(false); }}
        filterOpen={filterOpen} setFilterOpen={setFilterOpen}
        filterRating={filterRating} setFilterRating={setFilterRating}
        filterCuisines={filterCuisines} setFilterCuisines={setFilterCuisines}
        cuisines={cuisines}
        resultCount={sortedFiltered.length}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10,14,26,0.7)',
  },

  // Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    elevation: 12,
    shadowColor: '#000', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.md, marginTop: SPACING.sm, marginBottom: 8,
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, height: 44,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  searchDivider: { width: 1, height: 18, backgroundColor: COLORS.border },
  filterRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingBottom: 8, gap: 8,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, height: 32, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated, borderWidth: 1.5, borderColor: COLORS.border,
  },
  chipFilters: { paddingHorizontal: 14 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipClear: { borderColor: COLORS.error + '88', paddingHorizontal: 8 },
  filterCountBadge: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginLeft: 2,
  },
  filterCountText: { fontSize: 10, fontWeight: '900', color: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  subRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingBottom: 10,
  },
  countChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  countText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  locBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  surpriseBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, height: 36, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated, borderWidth: 1.5, borderColor: COLORS.border,
  },
  surpriseBtnText: { fontSize: 12, color: COLORS.text, fontWeight: '700' },

  // ── Search this area ────────────────────────────────────────────────────
  searchHereWrap: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  searchHereBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: RADIUS.full,
    elevation: 5,
    shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8,
  },
  searchHereText: { fontSize: 13, fontWeight: '700', color: '#111' },
  searchHereClear: {
    marginLeft: 2, width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center',
  },

  // ── Bottom card strip ───────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  card: {
    width: CARD_W, height: CARD_H,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    elevation: 10,
    shadowColor: '#000', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
  },
  cardSelected: { borderColor: COLORS.primary, borderWidth: 2 },
  cardImg: { width: 108, height: '100%' },
  cardImgPlaceholder: {
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, gap: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardName: { flex: 1, fontSize: 14, fontWeight: '800', color: COLORS.text, lineHeight: 18 },
  cardRatingBadge: {
    borderRadius: RADIUS.sm, paddingHorizontal: 9, paddingVertical: 4,
    minWidth: 40, alignItems: 'center',
  },
  cardRatingText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  cardMeta: { fontSize: 11.5, color: COLORS.textSecondary, fontWeight: '500' },
  cardDistRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardDistText: { fontSize: 11.5, color: COLORS.primary, fontWeight: '700' },
  cardDiscountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '22',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1.5, borderColor: COLORS.primary + '66',
  },
  cardDiscountText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  cardActions: { flexDirection: 'row', gap: 6 },
  cardInfoBtn: {
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: '#4A7AB5',
    backgroundColor: '#0D1E35',
  },
  cardInfoText: { color: '#7BB3E0', fontSize: 12, fontWeight: '800' },
  cardBookBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 7,
  },
  cardBookText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
