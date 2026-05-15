import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, Image, Alert, RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Restaurant, RootStackParamList } from '../../types';
import { restaurantsApi } from '../../api/restaurants';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING, RADIUS } from '../../constants';
import Button from '../../components/common/Button';
import { SkeletonCard } from '../../components/common/Skeleton';

const getDiscount = (id: string): number | null => {
  const pool = [null, null, null, 10, null, 20, null, null, 30, null, 15, null, null, 25, null];
  return pool[(id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % pool.length];
};

const coverOf = (r: Restaurant) =>
  r.cover_photo || r.coverPhoto || r.photos?.find(p => p.isCover)?.url || r.photos?.[0]?.url;

const scoreColor = (rating: number) => {
  const s = rating * 2;
  return s >= 9 ? '#00C896' : s >= 7 ? '#F59E0B' : COLORS.textMuted;
};

export default function FavoritesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const loadFavorites = useCallback((isRefresh = false) => {
    if (!isAuthenticated) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    restaurantsApi.getFavorites()
      .then(r => setFavorites(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [isAuthenticated]);

  useFocusEffect(useCallback(() => { loadFavorites(); }, [loadFavorites]));

  const removeFavorite = (r: Restaurant) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('წაშლა', `გსურთ "${r.name}" ფავორიტებიდან წაშლა?`, [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: 'წაშლა', style: 'destructive', onPress: async () => {
          setRemoving(r.id);
          try {
            await restaurantsApi.removeFavorite(r.id);
            setFavorites(prev => prev.filter(f => f.id !== r.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert('შეცდომა', 'წაშლა ვერ მოხერხდა');
          } finally {
            setRemoving(null);
          }
        },
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>ფავორიტები</Text>
        </View>
        <View style={styles.guestWrap}>
          <View style={styles.guestIconWrap}>
            <Ionicons name="heart-outline" size={52} color={COLORS.primary} />
          </View>
          <Text style={styles.guestTitle}>ჯერ ფავორიტი არ გაქვთ</Text>
          <Text style={styles.guestSub}>შედით ანგარიშში, რომ შეინახოთ თქვენი საყვარელი რესტორნები</Text>
          <Button label="შესვლა" onPress={() => navigation.navigate('Login')} style={styles.loginBtn} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ფავორიტები</Text>
        {favorites.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{favorites.length}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ padding: SPACING.md, gap: SPACING.md }}>
          {[1, 2, 3].map(i => (
            <SkeletonCard key={i} fullWidth />
          ))}
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadFavorites(true)}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="heart-outline" size={56} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>ფავორიტი არ გაქვთ</Text>
              <Text style={styles.emptySub}>
                შეეხეთ ❤️ ხატულას რესტორნის გვერდზე, რომ დაამატოთ ფავორიტებში
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => navigation.navigate('Search')}
              >
                <Text style={styles.exploreBtnText}>რესტორნების ძიება</Text>
                <Ionicons name="arrow-forward" size={15} color="#fff" />
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: r }) => {
            const cover = coverOf(r);
            const rating = Number(r.ratingAvg) || 0;
            const score = (rating * 2).toFixed(1);
            const sc = scoreColor(rating);
            const discount = getDiscount(r.id);
            const isRemoving = removing === r.id;

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('RestaurantDetail', { id: r.id })}
                activeOpacity={0.88}
              >
                {/* Image */}
                <View style={styles.imgWrap}>
                  {cover
                    ? <Image source={{ uri: cover }} style={styles.img} />
                    : <View style={[styles.img, styles.imgPlaceholder]}>
                        <Ionicons name="restaurant" size={36} color={COLORS.textMuted} />
                      </View>
                  }
                  {discount && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>-{discount}%</Text>
                    </View>
                  )}
                  {rating > 0 && (
                    <View style={[styles.scoreCircle, { backgroundColor: sc }]}>
                      <Text style={styles.scoreText}>{score}</Text>
                    </View>
                  )}
                </View>

                {/* Body */}
                <View style={styles.body}>
                  <View style={styles.bodyTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
                      {r.cuisine && (
                        <Text style={styles.cuisine}>
                          {r.cuisine.icon ? `${r.cuisine.icon} ` : ''}{r.cuisine.name}
                        </Text>
                      )}
                    </View>
                    {/* Remove button */}
                    <TouchableOpacity
                      style={styles.heartBtn}
                      onPress={() => removeFavorite(r)}
                      disabled={isRemoving}
                    >
                      {isRemoving
                        ? <ActivityIndicator size="small" color={COLORS.primary} />
                        : <Ionicons name="heart" size={20} color={COLORS.primary} />
                      }
                    </TouchableOpacity>
                  </View>

                  {/* Rating row */}
                  {rating > 0 && (
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                      {r.reviewsCount !== undefined && r.reviewsCount > 0 && (
                        <Text style={styles.reviewCount}>· {r.reviewsCount} შეფ.</Text>
                      )}
                    </View>
                  )}

                  {/* Address */}
                  {r.address ? (
                    <View style={styles.addrRow}>
                      <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                      <Text style={styles.addr} numberOfLines={1}>{r.address}</Text>
                    </View>
                  ) : null}

                  {/* Open status + book button */}
                  <View style={styles.footer}>
                    {r.isOpen !== undefined && (
                      <View style={[styles.openPill, r.isOpen ? styles.openOn : styles.openOff]}>
                        <View style={[styles.openDot, { backgroundColor: r.isOpen ? '#00C896' : COLORS.error }]} />
                        <Text style={[styles.openText, { color: r.isOpen ? '#00C896' : COLORS.error }]}>
                          {r.isOpen ? 'ახლა ღია' : 'დახურულია'}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.bookBtn}
                      onPress={() => navigation.navigate('RestaurantDetail', { id: r.id })}
                    >
                      <Text style={styles.bookBtnText}>ჯავშნა</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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

  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  countBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 9, paddingVertical: 3, borderRadius: RADIUS.full },
  countBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Guest
  guestWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  guestIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  guestTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  guestSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  loginBtn: { width: '100%', marginTop: SPACING.sm },

  // List
  list: { paddingBottom: 100 },
  sep: { height: 8, backgroundColor: COLORS.background },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: SPACING.xl, gap: SPACING.md },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  exploreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: 12, borderRadius: RADIUS.full },
  exploreBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Card
  card: { backgroundColor: COLORS.surface },
  imgWrap: { height: 190, position: 'relative' },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  discountBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: COLORS.primary, paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.sm },
  discountText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  scoreCircle: { position: 'absolute', bottom: 12, right: 12, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scoreText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  body: { padding: SPACING.md, gap: 6 },
  bodyTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  name: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  cuisine: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  heartBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  reviewCount: { fontSize: 12, color: COLORS.textMuted },

  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addr: { flex: 1, fontSize: 12, color: COLORS.textMuted },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  openPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full },
  openOn: { backgroundColor: '#00C89622' },
  openOff: { backgroundColor: COLORS.error + '22' },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  openText: { fontSize: 12, fontWeight: '700' },
  bookBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.md },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
