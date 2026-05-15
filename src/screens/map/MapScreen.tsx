import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Text, ActivityIndicator,
  Animated, Dimensions, ScrollView, Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Restaurant, Cuisine, RootStackParamList } from '../../types';
import { restaurantsApi, cuisinesApi } from '../../api/restaurants';
import { COLORS, SPACING, RADIUS } from '../../constants';

const { height } = Dimensions.get('window');
const POPUP_H = height * 0.28;

const TBILISI: Region = { latitude: 41.6938, longitude: 44.8015, latitudeDelta: 0.08, longitudeDelta: 0.08 };

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0A0E1A' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A9BBE' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0E1A' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#4A5A7A' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#8A9BBE' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0D1520' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3A4A5A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#111929' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1E2D3D' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#4A5A7A' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#16213A' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1E2D3D' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#6A7A9A' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#060C16' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3A4A5A' }] },
];

const coverOf = (r: Restaurant): string | null =>
  r.cover_photo || r.coverPhoto || r.photos?.find(p => p.isCover)?.url || r.photos?.[0]?.url || null;

const scoreColor = (rating: number) => {
  const s = rating * 2;
  return s >= 9 ? '#00C896' : s >= 7 ? '#F59E0B' : COLORS.textMuted;
};

type Cluster = {
  id: string;
  restaurants: Restaurant[];
  lat: number;
  lng: number;
};

function buildClusters(restaurants: Restaurant[], latDelta: number): Cluster[] {
  const radius = latDelta * 0.15;
  const used = new Set<number>();
  const result: Cluster[] = [];

  for (let i = 0; i < restaurants.length; i++) {
    if (used.has(i)) continue;
    const r = restaurants[i];
    const lat = Number(r.latitude);
    const lng = Number(r.longitude);
    const group: Restaurant[] = [r];
    used.add(i);

    if (latDelta >= 0.025) {
      for (let j = i + 1; j < restaurants.length; j++) {
        if (used.has(j)) continue;
        const r2 = restaurants[j];
        const lat2 = Number(r2.latitude);
        const lng2 = Number(r2.longitude);
        if (Math.abs(lat - lat2) < radius && Math.abs(lng - lng2) < radius) {
          group.push(r2);
          used.add(j);
        }
      }
    }

    const centerLat = group.reduce((s, x) => s + Number(x.latitude), 0) / group.length;
    const centerLng = group.reduce((s, x) => s + Number(x.longitude), 0) / group.length;
    result.push({ id: `c_${r.id}`, restaurants: group, lat: centerLat, lng: centerLng });
  }

  return result;
}

export default function MapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const mapRef = useRef<MapView>(null);
  const popupAnim = useRef(new Animated.Value(POPUP_H + 40)).current;
  const regionDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [locating, setLocating] = useState(false);
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const trackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterRating, setFilterRating] = useState<4 | 4.5 | null>(null);
  const [filterCuisine, setFilterCuisine] = useState<string | null>(null);
  const [sortNearest, setSortNearest] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [region, setRegion] = useState<Region>(TBILISI);

  useEffect(() => {
    (async () => {
      try {
        await Location.requestForegroundPermissionsAsync();
        const [restRes, cusRes] = await Promise.allSettled([
          restaurantsApi.getAll({ city: 'თბილისი', limit: 100 }),
          cuisinesApi.getAll(),
        ]);
        if (restRes.status === 'fulfilled') setRestaurants(restRes.value.data?.data || []);
        if (cusRes.status === 'fulfilled') setCuisines(Array.isArray(cusRes.value.data) ? cusRes.value.data : []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => restaurants.filter(r => {
    if (!r.latitude || !r.longitude) return false;
    if (filterOpen && !r.isOpen) return false;
    if (filterRating && Number(r.ratingAvg) < filterRating) return false;
    if (filterCuisine && r.cuisine?.id !== filterCuisine && (r as any).cuisineId !== filterCuisine) return false;
    return true;
  }), [restaurants, filterOpen, filterRating, filterCuisine]);

  const sortedFiltered = useMemo(() => {
    if (!sortNearest || !userLocation) return filtered;
    return [...filtered].sort((a, b) => {
      const da = Math.hypot(Number(a.latitude) - userLocation.lat, Number(a.longitude) - userLocation.lng);
      const db = Math.hypot(Number(b.latitude) - userLocation.lat, Number(b.longitude) - userLocation.lng);
      return da - db;
    });
  }, [filtered, sortNearest, userLocation]);

  const clusters = useMemo(
    () => buildClusters(sortedFiltered, region.latitudeDelta),
    [sortedFiltered, region.latitudeDelta],
  );

  useEffect(() => {
    setTracksViewChanges(true);
    if (trackTimer.current) clearTimeout(trackTimer.current);
    trackTimer.current = setTimeout(() => setTracksViewChanges(false), 600);
  }, [clusters]);

  const showPopup = useCallback((show: boolean) => {
    Animated.spring(popupAnim, {
      toValue: show ? 0 : POPUP_H + 40,
      useNativeDriver: true, tension: 70, friction: 12,
    }).start();
  }, [popupAnim]);

  const selectRestaurant = useCallback((r: Restaurant) => {
    setSelected(r);
    showPopup(true);
    mapRef.current?.animateToRegion({
      latitude: Number(r.latitude) - 0.005,
      longitude: Number(r.longitude),
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 400);
  }, [showPopup]);

  const goToMyLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600);
      setSelected(null);
      showPopup(false);
    } catch {}
    setLocating(false);
  }, [showPopup]);

  const onRegionChangeComplete = useCallback((r: Region) => {
    if (regionDebounce.current) clearTimeout(regionDebounce.current);
    regionDebounce.current = setTimeout(() => setRegion(r), 120);
  }, []);

  const handleClusterPress = useCallback((lat: number, lng: number) => {
    const newDelta = Math.max(region.latitudeDelta * 0.4, 0.005);
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: newDelta, longitudeDelta: newDelta },
      380,
    );
  }, [region.latitudeDelta]);

  const activeFilterCount = [filterOpen, filterRating !== null, filterCuisine !== null, sortNearest].filter(Boolean).length;

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={TBILISI}
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsBuildings={false}
        showsTraffic={false}
        onPress={() => { setSelected(null); showPopup(false); }}
        onRegionChangeComplete={onRegionChangeComplete}
      >
        {clusters.map(cluster => {
          const isCluster = cluster.restaurants.length > 1;
          const r = cluster.restaurants[0];
          const isSelected = !isCluster && selected?.id === r.id;
          const rating = Number(r.ratingAvg);
          const sc = scoreColor(rating);

          if (isCluster) {
            return (
              <Marker
                key={cluster.id}
                coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
                onPress={() => handleClusterPress(cluster.lat, cluster.lng)}
                tracksViewChanges={tracksViewChanges}
              >
                <View style={styles.clusterWrap}>
                  <Text style={styles.clusterText}>{cluster.restaurants.length}</Text>
                </View>
              </Marker>
            );
          }

          return (
            <Marker
              key={isSelected ? `${r.id}-sel` : r.id}
              coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
              onPress={() => selectRestaurant(r)}
              tracksViewChanges={tracksViewChanges || isSelected}
            >
              <View style={[styles.markerWrap, isSelected && styles.markerWrapSelected, { borderColor: isSelected ? COLORS.primary : sc }]}>
                <Text style={[styles.markerText, { color: isSelected ? '#fff' : sc }]}>
                  {rating > 0 ? (rating * 2).toFixed(1) : '•'}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      )}

      {/* ── HEADER ── */}
      <SafeAreaView style={styles.header} edges={['top']}>
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity style={[styles.chip, filterOpen && styles.chipActive]} onPress={() => setFilterOpen(v => !v)}>
            <View style={[styles.dot, { backgroundColor: filterOpen ? '#fff' : COLORS.success }]} />
            <Text style={[styles.chipText, filterOpen && styles.chipTextActive]}>ახლა ღია</Text>
          </TouchableOpacity>

          {([4, 4.5] as const).map(r => (
            <TouchableOpacity key={r} style={[styles.chip, filterRating === r && styles.chipActive]} onPress={() => setFilterRating(filterRating === r ? null : r)}>
              <Ionicons name="star" size={11} color={filterRating === r ? '#fff' : COLORS.star} />
              <Text style={[styles.chipText, filterRating === r && styles.chipTextActive]}>{r}+</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.chip, sortNearest && styles.chipActive]}
            onPress={() => { setSortNearest(s => !s); if (!sortNearest) goToMyLocation(); }}
          >
            <Ionicons name="navigate-outline" size={11} color={sortNearest ? '#fff' : COLORS.primary} />
            <Text style={[styles.chipText, sortNearest && styles.chipTextActive]}>ახლომახლო</Text>
          </TouchableOpacity>

          {cuisines.map(c => (
            <TouchableOpacity key={c.id} style={[styles.chip, filterCuisine === c.id && styles.chipActive]} onPress={() => setFilterCuisine(filterCuisine === c.id ? null : c.id)}>
              {c.icon ? <Text style={{ fontSize: 11 }}>{c.icon}</Text> : null}
              <Text style={[styles.chipText, filterCuisine === c.id && styles.chipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}

          {activeFilterCount > 0 && (
            <TouchableOpacity
              style={[styles.chip, styles.chipClear]}
              onPress={() => { setFilterOpen(false); setFilterRating(null); setFilterCuisine(null); setSortNearest(false); }}
            >
              <Ionicons name="close-circle" size={13} color={COLORS.error} />
              <Text style={[styles.chipText, { color: COLORS.error }]}>გასუფთავება</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={styles.subRow}>
          <View style={styles.countChip}>
            <Ionicons name="restaurant-outline" size={12} color={COLORS.primary} />
            <Text style={styles.countText}>{filtered.length} რესტორანი</Text>
          </View>
          <TouchableOpacity style={styles.locBtn} onPress={goToMyLocation}>
            {locating
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Ionicons name="navigate-outline" size={18} color={COLORS.primary} />}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── POPUP ── */}
      <Animated.View
        style={[styles.popup, { transform: [{ translateY: popupAnim }] }]}
        pointerEvents={selected ? 'auto' : 'none'}
      >
        {selected && (
          <TouchableOpacity
            style={styles.popupInner}
            onPress={() => navigation.navigate('RestaurantDetail', { id: selected.id })}
            activeOpacity={0.92}
          >
            <View style={styles.popupImgWrap}>
              {coverOf(selected)
                ? <Image source={{ uri: coverOf(selected)! }} style={styles.popupImg} />
                : <View style={[styles.popupImg, styles.imgPlaceholder]}>
                    <Ionicons name="restaurant" size={28} color={COLORS.textMuted} />
                  </View>
              }
              {Number(selected.ratingAvg) > 0 && (
                <View style={[styles.scoreCircle, { backgroundColor: scoreColor(Number(selected.ratingAvg)) }]}>
                  <Text style={styles.scoreText}>{(Number(selected.ratingAvg) * 2).toFixed(1)}</Text>
                </View>
              )}
            </View>
            <View style={styles.popupBody}>
              <Text style={styles.popupName} numberOfLines={2}>{selected.name}</Text>
              {selected.cuisine && (
                <Text style={styles.popupCuisine}>{selected.cuisine.name}</Text>
              )}
              <Text style={styles.popupAddr} numberOfLines={1}>{selected.address}</Text>
              {selected.isOpen !== undefined && (
                <View style={[styles.openPill, selected.isOpen ? styles.openOn : styles.openOff]}>
                  <Text style={[styles.openText, { color: selected.isOpen ? '#00C896' : COLORS.error }]}>
                    {selected.isOpen ? 'ახლა ღია' : 'დახურულია'}
                  </Text>
                </View>
              )}
              <View style={styles.popupCta}>
                <Text style={styles.popupCtaText}>დეტალები</Text>
                <Ionicons name="arrow-forward" size={13} color={COLORS.primary} />
              </View>
            </View>
            <TouchableOpacity
              style={styles.popupClose}
              onPress={() => { setSelected(null); showPopup(false); }}
            >
              <Ionicons name="close" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  map: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(10,14,26,0.7)' },

  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    elevation: 12, shadowColor: '#000', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.md, marginTop: SPACING.sm, marginBottom: 8,
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, height: 44,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: COLORS.textMuted },
  searchDivider: { width: 1, height: 18, backgroundColor: COLORS.border },

  filterRow: { paddingHorizontal: SPACING.md, paddingBottom: 8, gap: 8, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 32, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceElevated, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipClear: { borderColor: COLORS.error + '88' },
  chipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  dot: { width: 7, height: 7, borderRadius: 3.5 },

  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: 10 },
  countChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  countText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  locBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },

  markerWrap: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 2, borderColor: COLORS.textMuted, elevation: 4, shadowColor: '#000', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  markerWrapSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  markerText: { fontSize: 13, fontWeight: '900' },
  clusterWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, borderWidth: 3, borderColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.5, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  clusterText: { fontSize: 14, fontWeight: '900', color: '#fff' },

  popup: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderBottomWidth: 0, borderColor: COLORS.border,
    elevation: 20, shadowColor: '#000', shadowOpacity: 0.5, shadowOffset: { width: 0, height: -3 }, shadowRadius: 12,
  },
  popupInner: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.md, minHeight: POPUP_H },
  popupImgWrap: { width: 110, borderRadius: RADIUS.lg, overflow: 'hidden', position: 'relative', alignSelf: 'stretch' },
  popupImg: { width: '100%', height: '100%' },
  imgPlaceholder: { backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  scoreCircle: { position: 'absolute', bottom: 6, right: 6, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  scoreText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  popupBody: { flex: 1, gap: 4, justifyContent: 'center' },
  popupName: { fontSize: 16, fontWeight: '800', color: COLORS.text, lineHeight: 21 },
  popupCuisine: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  popupAddr: { fontSize: 12, color: COLORS.textMuted },
  openPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  openOn: { backgroundColor: '#00C89622' },
  openOff: { backgroundColor: COLORS.error + '22' },
  openText: { fontSize: 11, fontWeight: '700' },
  popupCta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  popupCtaText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  popupClose: { padding: 4, alignSelf: 'flex-start' },
});
