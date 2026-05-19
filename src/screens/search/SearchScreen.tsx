import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList,
  Image, ScrollView, Modal, Animated, Easing, Keyboard, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant, Cuisine, RootStackParamList } from '../../types';
import { restaurantsApi, cuisinesApi } from '../../api/restaurants';
import { COLORS, SPACING, RADIUS } from '../../constants';
import { SkeletonRestaurantRow } from '../../components/common/Skeleton';

type SortKey = 'rating' | 'name' | 'discount' | 'distance';
type PriceFilter = 1 | 2 | 3 | null;
type DietaryKey = 'vegan' | 'vegetarian' | 'halal' | 'glutenfree' | 'seafood';

const DIETARY_OPTIONS: { key: DietaryKey; label: string; emoji: string; keywords: string[] }[] = [
  { key: 'vegan',      label: 'ვეგანური',      emoji: '🌱', keywords: ['vegan', 'ვეგან'] },
  { key: 'vegetarian', label: 'ვეგეტარიანული', emoji: '🥗', keywords: ['vegetarian', 'ვეგეტარიან'] },
  { key: 'halal',      label: 'ჰალალი',        emoji: '☪️',  keywords: ['halal', 'ჰალალ'] },
  { key: 'glutenfree', label: 'უგლუტენო',      emoji: '🌾', keywords: ['gluten', 'გლუტენ'] },
  { key: 'seafood',    label: 'ზღვის პროდ.',   emoji: '🦐', keywords: ['seafood', 'fish', 'ზღვ', 'თევზ'] },
];

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const HISTORY_KEY = 'search_history';
const MAX_HISTORY = 5;

const getDiscount = (id: string): number | null => {
  const pool = [null, null, null, 10, null, 20, null, null, 30, null, 15, null, null, 25, null];
  return pool[(id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % pool.length];
};

const coverOf = (r: Restaurant): string | null =>
  r.cover_photo || r.coverPhoto || r.photos?.find(p => p.isCover)?.url || r.photos?.[0]?.url || null;

const scoreColor = (rating: number) =>
  rating >= 4.5 ? COLORS.scoreGood : rating >= 3.5 ? COLORS.scoreMid : COLORS.textMuted;

type RouteProps = RouteProp<RootStackParamList, 'Search'>;

function FadeInItem({ index, children }: { index: number; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      delay: Math.min(index * 35, 280),
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  }, []);
  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
    }}>
      {children}
    </Animated.View>
  );
}

export default function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProps>();
  const inputRef = useRef<TextInput>(null);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(route.params?.dishQuery || '');
  const [inputFocused, setInputFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  // Primary filters (always visible)
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterDiscount, setFilterDiscount] = useState(false);
  const [showRatingPicker, setShowRatingPicker] = useState(false);

  // Secondary filters (in modal)
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterCuisine, setFilterCuisine] = useState<string | null>(route.params?.cuisineId || null);

  useEffect(() => {
    if (route.params?.cuisineId) {
      setFilterCuisine(route.params.cuisineId);
      setSortKey('rating');
      setSearchQuery('');
    }
  }, [route.params?.cuisineId]);
  const [filterPrice, setFilterPrice] = useState<PriceFilter>(null);
  const [filterDietary, setFilterDietary] = useState<Set<DietaryKey>>(new Set());

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('rating');
  const [showSort, setShowSort] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  // Near Me
  const [filterNearMe, setFilterNearMe] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);

  // Animations
  const ratingAnim = useRef(new Animated.Value(0)).current;
  const sortAnim   = useRef(new Animated.Value(0)).current;
  const modalAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(ratingAnim, { toValue: showRatingPicker ? 1 : 0, useNativeDriver: true, speed: 22, bounciness: 5 }).start();
  }, [showRatingPicker]);

  useEffect(() => {
    Animated.spring(sortAnim, { toValue: showSort ? 1 : 0, useNativeDriver: true, speed: 22, bounciness: 4 }).start();
  }, [showSort]);

  useEffect(() => {
    inputRef.current?.focus();
    AsyncStorage.getItem(HISTORY_KEY).then(v => { if (v) setHistory(JSON.parse(v)); });
    (async () => {
      try {
        const [restRes, cusRes] = await Promise.allSettled([
          restaurantsApi.getAll({ city: 'თბილისი', limit: 2000 }),
          cuisinesApi.getAll(),
        ]);
        if (restRes.status === 'fulfilled') setRestaurants(restRes.value.data?.data || []);
        if (cusRes.status === 'fulfilled') {
          const raw: Cuisine[] = Array.isArray(cusRes.value.data) ? cusRes.value.data : [];
          setCuisines(raw.sort((a, b) => (a.name?.toLowerCase().includes('ქართ') ? -1 : 0) - (b.name?.toLowerCase().includes('ქართ') ? -1 : 0)));
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const saveHistory = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) return;
    setHistory(prev => {
      const updated = [q, ...prev.filter(h => h !== q)].slice(0, MAX_HISTORY);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = () => {
    setHistory([]);
    AsyncStorage.removeItem(HISTORY_KEY);
  };

  const secondaryFilterCount = [
    filterCuisine !== null,
    filterPrice !== null,
    filterDietary.size > 0,
  ].filter(Boolean).length;

  const primaryFilterCount = [filterOpen, filterRating !== null, filterDiscount, filterNearMe].filter(Boolean).length;
  const activeFilterCount  = primaryFilterCount + secondaryFilterCount;

  const toggleDietary = (key: DietaryKey) => {
    setFilterDietary(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const clearFilters = () => {
    setFilterOpen(false); setFilterRating(null); setShowRatingPicker(false);
    setFilterDiscount(false); setFilterCuisine(null); setFilterPrice(null);
    setFilterDietary(new Set()); setSearchQuery('');
    setFilterNearMe(false); setSortKey('rating');
  };

  const clearSecondaryFilters = () => {
    setFilterCuisine(null); setFilterPrice(null); setFilterDietary(new Set());
  };

  const toggleNearMe = async () => {
    if (filterNearMe) {
      setFilterNearMe(false);
      if (sortKey === 'distance') setSortKey('rating');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNearMeLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setNearMeLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setFilterNearMe(true);
      setSortKey('distance');
    } catch {}
    setNearMeLoading(false);
  };

  const filtered = restaurants.filter(r => {
    if (filterOpen && !r.isOpen) return false;
    if (filterRating && Number(r.ratingAvg) < filterRating) return false;
    if (filterCuisine && r.cuisine?.id !== filterCuisine && (r as any).cuisineId !== filterCuisine) return false;
    if (filterPrice && (r as any).priceLevel && (r as any).priceLevel !== filterPrice) return false;
    if (filterDiscount && getDiscount(r.id) === null) return false;
    if (filterDietary.size > 0) {
      const haystack = `${r.name} ${r.description || ''} ${r.cuisine?.name || ''}`.toLowerCase();
      if (![...filterDietary].every(key => DIETARY_OPTIONS.find(d => d.key === key)?.keywords.some(kw => haystack.includes(kw)))) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!r.name.toLowerCase().includes(q) && !(r.cuisine?.name || '').toLowerCase().includes(q) && !(r.address || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'distance' && userLocation) {
      return distanceKm(userLocation.lat, userLocation.lng, Number(a.latitude), Number(a.longitude))
           - distanceKm(userLocation.lat, userLocation.lng, Number(b.latitude), Number(b.longitude));
    }
    if (sortKey === 'rating') return Number(b.ratingAvg) - Number(a.ratingAvg);
    if (sortKey === 'discount') return (getDiscount(b.id) || 0) - (getDiscount(a.id) || 0);
    return a.name.localeCompare(b.name);
  });

  const displayResults = filterNearMe ? sorted.slice(0, 25) : sorted;
  const visibleResults = displayResults.slice(0, visibleCount);
  const hasMore = displayResults.length > visibleCount;

  useEffect(() => { setVisibleCount(20); }, [searchQuery, filterRating, filterDiscount, filterOpen, filterCuisine, filterPrice, filterDietary, sortKey, filterNearMe]);

  const viewOnMap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    navigation.navigate('Main', {
      screen: 'Map',
      params: {
        cuisineId: filterCuisine ?? undefined,
        filterOpen: filterOpen || undefined,
        filterRating: (filterRating === 4 || filterRating === 4.5) ? filterRating : undefined,
        sortNearest: filterNearMe || undefined,
        userLat: userLocation?.lat,
        userLng: userLocation?.lng,
      },
    });
  };

  const showHistory = inputFocused && searchQuery.length === 0 && history.length > 0;

  const sortTranslate = sortAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });
  const ratingTranslate = ratingAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={COLORS.primary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="რესტორანი, სამზარეულო, მისამართი..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setInputFocused(true)}
            onBlur={() => { setInputFocused(false); if (searchQuery.trim()) saveHistory(searchQuery); }}
            onSubmitEditing={() => saveHistory(searchQuery)}
            returnKeyType="search"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Search history ── */}
      {showHistory && (
        <View style={styles.historyBox}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>ბოლო ძიება</Text>
            <TouchableOpacity onPress={clearHistory}>
              <Text style={styles.historyClear}>გასუფთავება</Text>
            </TouchableOpacity>
          </View>
          {history.map((h, i) => (
            <TouchableOpacity key={i} style={styles.historyRow} onPress={() => { setSearchQuery(h); setInputFocused(false); Keyboard.dismiss(); }}>
              <Ionicons name="time-outline" size={15} color={COLORS.textMuted} />
              <Text style={styles.historyText}>{h}</Text>
              <Ionicons name="arrow-up-outline" size={14} color={COLORS.textMuted} style={{ transform: [{ rotate: '45deg' }] }} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Primary filter bar ── */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>

          {/* Near Me — prominent */}
          <TouchableOpacity
            style={[styles.chip, styles.chipNearMe, filterNearMe && styles.chipNearMeActive]}
            onPress={toggleNearMe}
            activeOpacity={0.8}
          >
            {nearMeLoading
              ? <ActivityIndicator size="small" color={filterNearMe ? '#fff' : COLORS.primary} style={{ width: 13, height: 13 }} />
              : <Ionicons name={filterNearMe ? 'navigate' : 'navigate-outline'} size={13} color={filterNearMe ? '#fff' : COLORS.primary} />
            }
            <Text style={[styles.chipText, { color: filterNearMe ? '#fff' : COLORS.primary }]}>ახლოს</Text>
          </TouchableOpacity>

          {/* Open now */}
          <TouchableOpacity style={[styles.chip, filterOpen && styles.chipActive]} onPress={() => setFilterOpen(!filterOpen)}>
            <View style={[styles.dot, { backgroundColor: filterOpen ? '#fff' : COLORS.success }]} />
            <Text style={[styles.chipText, filterOpen && styles.chipTextActive]}>ახლა ღია</Text>
          </TouchableOpacity>

          {/* Rating */}
          <TouchableOpacity style={[styles.chip, filterRating !== null && styles.chipActive]} onPress={() => setShowRatingPicker(s => !s)}>
            <Ionicons name="star" size={11} color={filterRating !== null ? '#fff' : COLORS.star} />
            <Text style={[styles.chipText, filterRating !== null && styles.chipTextActive]}>
              {filterRating !== null ? `${filterRating}★+` : 'შეფასება'}
            </Text>
          </TouchableOpacity>

          {/* Discount */}
          <TouchableOpacity style={[styles.chip, filterDiscount && styles.chipActive]} onPress={() => setFilterDiscount(!filterDiscount)}>
            <Text style={{ fontSize: 11 }}>🏷️</Text>
            <Text style={[styles.chipText, filterDiscount && styles.chipTextActive]}>აქცია</Text>
          </TouchableOpacity>

          {/* Secondary filters button */}
          <TouchableOpacity
            style={[styles.chip, secondaryFilterCount > 0 && styles.chipSecondary]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="options-outline" size={13} color={secondaryFilterCount > 0 ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.chipText, secondaryFilterCount > 0 && { color: COLORS.primary }]}>
              ფილტრი{secondaryFilterCount > 0 ? ` (${secondaryFilterCount})` : ''}
            </Text>
          </TouchableOpacity>

          {/* Clear all */}
          {activeFilterCount > 0 && (
            <TouchableOpacity style={[styles.chip, styles.chipClear]} onPress={clearFilters}>
              <Ionicons name="close-circle" size={13} color={COLORS.error} />
              <Text style={[styles.chipText, { color: COLORS.error }]}>გასუფთავება</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* ── Rating picker (animated) ── */}
      {showRatingPicker && (
        <Animated.View style={[styles.ratingPicker, { opacity: ratingAnim, transform: [{ translateY: ratingTranslate }] }]}>
          <Text style={styles.ratingPickerLabel}>მინიმალური შეფასება</Text>
          <View style={styles.ratingStarsRow}>
            {[1, 2, 3, 4, 5].map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => { setFilterRating(filterRating === s ? null : s); setShowRatingPicker(false); }}
                style={styles.ratingStar}
              >
                <Ionicons
                  name={filterRating !== null && s <= filterRating ? 'star' : 'star-outline'}
                  size={28}
                  color={filterRating !== null && s <= filterRating ? COLORS.star : COLORS.textMuted}
                />
                <Text style={styles.ratingStarNum}>{s}.0+</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {/* ── Results bar ── */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsCount}>
          {loading ? 'იტვირთება...' : `${displayResults.length} რესტორანი`}
        </Text>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort(s => !s)}>
          <Ionicons name="swap-vertical-outline" size={15} color={COLORS.primary} />
          <Text style={styles.sortBtnText}>
            {sortKey === 'distance' ? 'მანძილით' : sortKey === 'rating' ? 'შეფასებით' : sortKey === 'name' ? 'სახელით' : 'ფასდაკლებით'}
          </Text>
          <Ionicons name={showSort ? 'chevron-up' : 'chevron-down'} size={13} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Sort dropdown (animated) ── */}
      {showSort && (
        <Animated.View style={[styles.sortDropdown, { opacity: sortAnim, transform: [{ translateY: sortTranslate }] }]}>
          {([
            ...(filterNearMe ? [['distance', '📍 მანძილით']] : []),
            ['rating', '⭐ შეფასებით'], ['name', '🔤 სახელით'], ['discount', '🏷️ ფასდაკლებით'],
          ] as [SortKey, string][]).map(([k, l]) => (
            <TouchableOpacity
              key={k}
              style={[styles.sortOption, sortKey === k && styles.sortOptionActive]}
              onPress={() => { setSortKey(k); setShowSort(false); }}
            >
              <Text style={[styles.sortOptionText, sortKey === k && styles.sortOptionTextActive]}>{l}</Text>
              {sortKey === k && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      {/* ── List ── */}
      {loading ? (
        <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.md, gap: SPACING.sm }}>
          {[1, 2, 3, 4, 5].map(i => <SkeletonRestaurantRow key={i} />)}
        </View>
      ) : (
        <FlatList
          data={visibleResults}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>შედეგი არ მოიძებნა</Text>
              <Text style={styles.emptySub}>
                {searchQuery.trim()
                  ? `"${searchQuery}" — ვერ მოიძებნა\nსცადეთ სხვა სიტყვა`
                  : 'სცადეთ ფილტრების შეცვლა'}
              </Text>
              {activeFilterCount > 0 && (
                <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                  <Ionicons name="refresh-outline" size={15} color="#fff" />
                  <Text style={styles.clearBtnText}>ფილტრების გასუფთავება</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item, index }) => (
            <FadeInItem index={index}>
              <SearchCard restaurant={item} navigation={navigation} userLocation={userLocation} />
            </FadeInItem>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListFooterComponent={hasMore ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setVisibleCount(c => c + 20)}>
              <Text style={styles.loadMoreText}>მეტის ჩვენება ({displayResults.length - visibleCount} დარჩა)</Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          ) : null}
        />
      )}

      {/* ── View on Map floating button ── */}
      {!loading && displayResults.length > 0 && (
        <View style={styles.mapBtnWrap} pointerEvents="box-none">
          <TouchableOpacity style={styles.mapBtn} onPress={viewOnMap} activeOpacity={0.85}>
            <Ionicons name="map" size={16} color={COLORS.primary} />
            <Text style={styles.mapBtnText}>რუკაზე ნახვა · {displayResults.length}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Filter modal ── */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={modal.root}>
          {/* Handle */}
          <View style={modal.handle}><View style={modal.handleBar} /></View>

          {/* Header */}
          <View style={modal.header}>
            <Text style={modal.title}>ფილტრები</Text>
            <TouchableOpacity onPress={() => { clearSecondaryFilters(); }}>
              <Text style={modal.clearAll}>გასუფთავება</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={modal.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

            {/* Price section */}
            <View style={modal.section}>
              <Text style={modal.sectionTitle}>💰 ფასის კატეგორია</Text>
              <View style={modal.chipWrap}>
                {([1, 2, 3] as const).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[modal.chip, filterPrice === p && modal.chipActive]}
                    onPress={() => setFilterPrice(filterPrice === p ? null : p)}
                  >
                    <Text style={[modal.chipText, filterPrice === p && modal.chipTextActive]}>
                      {'₾'.repeat(p)} {p === 1 ? '· ეკონომი' : p === 2 ? '· საშუალო' : '· პრემიუმ'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Cuisine section */}
            <View style={modal.section}>
              <Text style={modal.sectionTitle}>🍽️ სამზარეულო</Text>
              <View style={modal.chipWrap}>
                {cuisines.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[modal.chip, filterCuisine === c.id && modal.chipActive]}
                    onPress={() => setFilterCuisine(filterCuisine === c.id ? null : c.id)}
                  >
                    <Text style={[modal.chipText, filterCuisine === c.id && modal.chipTextActive]}>
                      {c.icon ? `${c.icon} ` : ''}{c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Dietary section */}
            <View style={modal.section}>
              <Text style={modal.sectionTitle}>🌿 დიეტური პრეფერენცია</Text>
              <View style={modal.chipWrap}>
                {DIETARY_OPTIONS.map(d => {
                  const active = filterDietary.has(d.key);
                  return (
                    <TouchableOpacity
                      key={d.key}
                      style={[modal.chip, active && modal.chipDiet]}
                      onPress={() => toggleDietary(d.key)}
                    >
                      <Text style={[modal.chipText, active && modal.chipTextActive]}>
                        {d.emoji} {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Sort section */}
            <View style={modal.section}>
              <Text style={modal.sectionTitle}>↕️ დალაგება</Text>
              <View style={modal.sortGroup}>
                {([['rating', '⭐ შეფასებით'], ['name', '🔤 სახელით'], ['discount', '🏷️ ფასდაკლებით']] as [SortKey, string][]).map(([k, l]) => (
                  <TouchableOpacity
                    key={k}
                    style={[modal.sortRow, sortKey === k && modal.sortRowActive]}
                    onPress={() => setSortKey(k)}
                  >
                    <Text style={[modal.sortRowText, sortKey === k && modal.sortRowTextActive]}>{l}</Text>
                    {sortKey === k && <Ionicons name="radio-button-on" size={18} color={COLORS.primary} />}
                    {sortKey !== k && <Ionicons name="radio-button-off" size={18} color={COLORS.textMuted} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </ScrollView>

          {/* Apply button */}
          <View style={modal.footer}>
            <TouchableOpacity style={modal.applyBtn} onPress={() => setFilterModalVisible(false)}>
              <Text style={modal.applyText}>
                გამოყენება {secondaryFilterCount > 0 ? `· ${secondaryFilterCount} ფილტრი` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function SearchCard({ restaurant: r, navigation, userLocation }: { restaurant: Restaurant; navigation: any; userLocation: { lat: number; lng: number } | null }) {
  const cover = coverOf(r);
  const rating = Number(r.ratingAvg) || 0;
  const score = rating.toFixed(1);
  const sc = scoreColor(rating);
  const discount = getDiscount(r.id);
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  const onPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    navigation.navigate('RestaurantDetail', { id: r.id });
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <View style={styles.cardImgWrap}>
          {cover
            ? <Image source={{ uri: cover }} style={styles.cardImg} />
            : <View style={[styles.cardImg, styles.imgPlaceholder]}>
                <Ionicons name="restaurant" size={32} color={COLORS.textMuted} />
              </View>
          }
          {discount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}
          {rating > 0 && (
            <View style={[styles.scoreRect, { backgroundColor: sc }]}>
              <Text style={styles.scoreRectText}>{score}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardName} numberOfLines={1}>{r.name}</Text>
          </View>

          {r.cuisine && (
            <Text style={styles.cardCuisine}>
              {r.cuisine.icon ? `${r.cuisine.icon} ` : ''}{r.cuisine.name}
            </Text>
          )}

          <View style={styles.cardMeta}>
            {r.isOpen !== undefined && (
              <View style={[styles.openPill, r.isOpen ? styles.openOn : styles.openOff]}>
                <View style={[styles.openDot, { backgroundColor: r.isOpen ? COLORS.scoreGood : COLORS.error }]} />
                <Text style={[styles.openText, { color: r.isOpen ? COLORS.scoreGood : COLORS.error }]}>
                  {r.isOpen ? 'ღია' : 'დახ.'}
                </Text>
              </View>
            )}
            {rating > 0 && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={11} color={COLORS.star} />
                <Text style={styles.cardMetaText}>{rating.toFixed(1)}</Text>
                {r.reviewsCount !== undefined && r.reviewsCount > 0 && (
                  <Text style={styles.cardMetaText}>({r.reviewsCount})</Text>
                )}
              </View>
            )}
            {userLocation && r.latitude && r.longitude && (() => {
              const d = distanceKm(userLocation.lat, userLocation.lng, Number(r.latitude), Number(r.longitude));
              return (
                <View style={styles.distancePill}>
                  <Ionicons name="navigate" size={10} color={COLORS.primary} />
                  <Text style={styles.distanceText}>{d < 1 ? `${Math.round(d * 1000)}მ` : `${d.toFixed(1)}კმ`}</Text>
                </View>
              );
            })()}
          </View>

          {r.address ? (
            <View style={styles.cardAddrRow}>
              <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
              <Text style={styles.cardAddr} numberOfLines={1}>{r.address}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => navigation.navigate('Booking', { restaurantId: r.id })}
          >
            <Ionicons name="calendar-outline" size={13} color="#fff" />
            <Text style={styles.bookBtnText}>მაგიდის ჯავშნა</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, height: 44,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },

  historyBox: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingTop: 12, paddingBottom: 4 },
  historyTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  historyClear: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 11, borderTopWidth: 1, borderTopColor: COLORS.border },
  historyText: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },

  filterBar: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterRow: { paddingHorizontal: SPACING.md, paddingVertical: 10, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, height: 32, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated, borderWidth: 1.5, borderColor: COLORS.border,
  },
  chipActive:      { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipSecondary:   { borderColor: COLORS.primary + '66' },
  chipClear:       { borderColor: COLORS.error + '88' },
  chipNearMe:      { borderColor: COLORS.primary, borderWidth: 2, paddingHorizontal: 14 },
  chipNearMeActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:        { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  chipTextActive:  { color: '#fff' },
  dot: { width: 7, height: 7, borderRadius: 3.5 },

  ratingPicker: {
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  ratingPickerLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  ratingStarsRow: { flexDirection: 'row', gap: 4 },
  ratingStar: { alignItems: 'center', gap: 4, flex: 1 },
  ratingStarNum: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },

  resultsBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  resultsCount: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },

  sortDropdown: {
    position: 'absolute', top: 148, right: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    zIndex: 99, elevation: 20, minWidth: 180, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
  },
  sortOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  sortOptionActive: { backgroundColor: COLORS.primaryLight },
  sortOptionText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  sortOptionTextActive: { color: COLORS.primary, fontWeight: '800' },

  listContent: { paddingBottom: 32 },
  loadMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, marginHorizontal: SPACING.md, marginTop: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  sep: { height: 8, backgroundColor: COLORS.background },

  emptyWrap: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: SPACING.xl, gap: SPACING.md },
  emptyEmoji: { fontSize: 64, marginBottom: SPACING.sm },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: 10, borderRadius: RADIUS.full },
  clearBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  card: { backgroundColor: COLORS.surface, flexDirection: 'row', padding: SPACING.md, gap: SPACING.md },
  cardImgWrap: { width: 120, height: 120, borderRadius: RADIUS.lg, overflow: 'hidden', flexShrink: 0, position: 'relative' },
  cardImg: { width: '100%', height: '100%' },
  imgPlaceholder: { backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  discountBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: COLORS.primary, paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.sm },
  discountText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  scoreRect: { position: 'absolute', bottom: 6, right: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  scoreRectText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  cardBody: { flex: 1, gap: 5 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.text, lineHeight: 20 },
  openPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.full },
  openDot: { width: 5, height: 5, borderRadius: 2.5 },
  openOn: { backgroundColor: COLORS.scoreGood + '22' },
  openOff: { backgroundColor: COLORS.error + '22' },
  openText: { fontSize: 10, fontWeight: '800' },
  cardCuisine: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardMetaText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  cardAddrRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardAddr: { flex: 1, fontSize: 11, color: COLORS.textMuted },
  distancePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.primary + '18', paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.full },
  distanceText: { fontSize: 10, fontWeight: '800', color: COLORS.primary },

  mapBtnWrap: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: '#0A0E1A',
    paddingHorizontal: 22, paddingVertical: 13,
    borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.primary,
    elevation: 12,
    shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
  },
  mapBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4, backgroundColor: COLORS.primary, paddingVertical: 9, borderRadius: RADIUS.md },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});

const modal = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  handle: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  clearAll: { fontSize: 14, color: COLORS.error, fontWeight: '600' },
  scroll: { flex: 1 },
  section: { paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated, borderWidth: 1.5, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipDiet:   { backgroundColor: '#16a34a22', borderColor: '#16a34a88' },
  chipText:   { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  sortGroup: { gap: 4 },
  sortRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sortRowActive: { borderColor: COLORS.primary + '66', backgroundColor: COLORS.primaryLight },
  sortRowText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  sortRowTextActive: { color: COLORS.primary, fontWeight: '800' },
  footer: { padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  applyBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 15, alignItems: 'center' },
  applyText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
