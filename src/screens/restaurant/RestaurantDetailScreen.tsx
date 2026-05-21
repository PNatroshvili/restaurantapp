import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, FlatList, Modal, Linking, Share, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Restaurant, MenuCategory, Review, RootStackParamList } from '../../types';
import ScoreBadge from '../../components/common/ScoreBadge';
import { restaurantsApi } from '../../api/restaurants';
import { eventsApi, RestaurantEvent } from '../../api/events';
import { COLORS, SPACING, RADIUS, DAYS_GE } from '../../constants';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { showToast } from '../../components/common/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StarRating from '../../components/common/StarRating';
import Button from '../../components/common/Button';
import { SkeletonRestaurantDetail } from '../../components/common/Skeleton';
import { trackView } from '../../services/recentlyViewed';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 280;

type RouteProps = RouteProp<RootStackParamList, 'RestaurantDetail'>;

const getDiscount = (id: string): number | null => {
  const pool = [null, null, null, 10, null, 20, null, null, 30, null, 15, null, null, 25, null];
  return pool[(id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % pool.length];
};

export default function RestaurantDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const requireAuth = useRequireAuth();
  const insets = useSafeAreaInsets();
  const { id } = route.params;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [events, setEvents] = useState<RestaurantEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'menu' | 'reviews'>('info');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [activeMenuCat, setActiveMenuCat] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const tabY = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const [rRes, favRes] = await Promise.allSettled([
          restaurantsApi.getById(id),
          restaurantsApi.getFavorites(),
        ]);
        if (rRes.status === 'fulfilled') {
          setRestaurant(rRes.value.data);
          trackView(rRes.value.data).catch(() => {});
        }
        if (favRes.status === 'fulfilled') {
          const favs = Array.isArray(favRes.value.data) ? favRes.value.data : [];
          setIsFav(favs.some((f: any) => f.id === id || f.restaurantId === id));
        }
        if (rRes.status === 'fulfilled') {
          const [mRes, revRes] = await Promise.allSettled([
            restaurantsApi.getMenu(id),
            restaurantsApi.getReviews(id),
          ]);
          if (mRes.status === 'fulfilled') setMenu(mRes.value.data || []);
          if (revRes.status === 'fulfilled') setReviews(revRes.value.data?.data || []);
          eventsApi.getForRestaurant(id).then(r => setEvents(r.data)).catch(() => {});
        }
      } catch {
        Alert.alert('შეცდომა', 'ინფორმაცია ვერ ჩაიტვირთა');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const toggleFav = () => requireAuth(async () => {
    if (!restaurant) return;
    const prev = isFav;
    setIsFav(!prev);
    Haptics.impactAsync(!prev ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    try {
      if (prev) { await restaurantsApi.removeFavorite(restaurant.id); showToast('ფავორიტებიდან წაიშალა', 'info'); }
      else { await restaurantsApi.addFavorite(restaurant.id); showToast('ფავორიტებში დაემატა ❤️'); }
    } catch {
      setIsFav(prev);
    }
  });

  const openMaps = () => {
    if (!restaurant) return;
    const { latitude: lat, longitude: lng, name } = restaurant;
    const label = encodeURIComponent(name);
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_name=${label}`;
    Linking.canOpenURL('comgooglemaps://')
      .then(s => Linking.openURL(s ? `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving` : googleUrl))
      .catch(() => Linking.openURL(googleUrl));
  };

  const handleShare = () => {
    if (!restaurant) return;
    const rating = Number(restaurant.ratingAvg) || 0;
    const score = rating > 0 ? ` · ${rating.toFixed(1)}/5 ⭐` : '';
    Share.share({
      message: `🍽️ ${restaurant.name}${score}\n📍 ${restaurant.address}\n\nგაიცანი ეს რესტორანი GastroMap-ზე!`,
      title: restaurant.name,
    });
  };

  const switchTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ y: tabY.current, animated: true });
  };

  if (loading || !restaurant) {
    return <SkeletonRestaurantDetail />;
  }

  const photos = restaurant.photos || [];
  const allPhotos = photos.length > 0 ? photos : [];
  const coverUri = restaurant.cover_photo || restaurant.coverPhoto || photos.find(p => p.isCover)?.url || photos[0]?.url;
  const rating = Number(restaurant.ratingAvg) || 0;
  const score = rating.toFixed(1);
  const scoreNum = rating;
  const scoreColor = scoreNum >= 4.5 ? '#00C896' : scoreNum >= 3.5 ? '#F59E0B' : COLORS.textSecondary;
  const discount = getDiscount(id);
  const today = new Date().getDay();
  const todayHours = restaurant.workingHours?.find(wh => wh.day === today);

  // Live wait time estimate based on time of day + day of week
  const waitTime = (() => {
    const h = new Date().getHours();
    const isWeekend = today === 0 || today === 6;
    const isPeak = (h >= 12 && h <= 14) || (h >= 19 && h <= 22);
    if (!restaurant.isOpen) return null;
    const base = isPeak ? (isWeekend ? 30 : 20) : (isWeekend ? 15 : 5);
    const jitter = (id.charCodeAt(0) % 10) - 5;
    return Math.max(5, base + jitter);
  })();

  return (
    <View style={styles.root}>
      {/* Drag handle */}
      <View style={styles.handle}><View style={styles.handleBar} /></View>

      <Animated.ScrollView
        ref={scrollRef as any}
        showsVerticalScrollIndicator={false}
        bounces={false}
        stickyHeaderIndices={[5]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >

        {/* ── Hero ── */}
        <View style={{ height: HERO_HEIGHT }}>
          {allPhotos.length > 1 ? (
            <>
              <FlatList
                data={allPhotos}
                horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                keyExtractor={p => p.id}
                onMomentumScrollEnd={e => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
                renderItem={({ item, index }) => (
                  <TouchableOpacity activeOpacity={0.95} onPress={() => { setPhotoIndex(index); setGalleryVisible(true); }}>
                    <Image source={{ uri: item.url }} style={styles.heroImg} />
                  </TouchableOpacity>
                )}
              />
              <View style={styles.dotRow}>
                {allPhotos.map((_, i) => (
                  <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
                ))}
              </View>
            </>
          ) : coverUri ? (
            <TouchableOpacity activeOpacity={0.95} onPress={() => setGalleryVisible(true)} style={{ overflow: 'hidden', height: HERO_HEIGHT }}>
              <Animated.Image
                source={{ uri: coverUri }}
                style={[
                  styles.heroImg,
                  { height: HERO_HEIGHT + 80 },
                  { transform: [{ translateY: scrollY.interpolate({
                      inputRange: [0, HERO_HEIGHT],
                      outputRange: [0, 36],
                      extrapolate: 'clamp',
                    }) }] },
                ]}
              />
            </TouchableOpacity>
          ) : (
            <View style={[styles.heroImg, styles.heroPlaceholder]}>
              <Ionicons name="restaurant" size={64} color={COLORS.textMuted} />
            </View>
          )}

          {/* Top shadow — back button readability */}
          <LinearGradient
            colors={['rgba(0,0,0,0.52)', 'transparent']}
            style={styles.heroGradientTop}
            pointerEvents="none"
          />
          {/* Bottom shadow — bleeds into content below */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.68)']}
            style={styles.heroGradientBottom}
            pointerEvents="none"
          />

          {/* Discount banner */}
          {discount && (
            <View style={styles.discountBanner}>
              <Ionicons name="pricetag" size={12} color="#fff" />
              <Text style={styles.discountBannerText}>{discount}% ფასდაკლება</Text>
            </View>
          )}

          {/* Photo count */}
          {allPhotos.length > 1 && (
            <View style={styles.photoCount}>
              <Ionicons name="images-outline" size={13} color="#fff" />
              <Text style={styles.photoCountText}>{photoIndex + 1}/{allPhotos.length}</Text>
            </View>
          )}

          {/* Action buttons overlay */}
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-down" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroActionBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroActionBtn} onPress={toggleFav}>
              <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? COLORS.primary : '#fff'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Name & Score ── */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{restaurant.name}</Text>
              <View style={styles.nameSubRow}>
                {restaurant.cuisine && (
                  <Text style={styles.cuisine}>{restaurant.cuisine.name}</Text>
                )}
                {restaurant.isOpen !== undefined && (
                  <View style={[styles.openPill, restaurant.isOpen ? styles.openPillOpen : styles.openPillClosed]}>
                    <View style={[styles.openDot, { backgroundColor: restaurant.isOpen ? '#00C896' : COLORS.error }]} />
                    <Text style={[styles.openText, { color: restaurant.isOpen ? '#00C896' : COLORS.error }]}>
                      {restaurant.isOpen ? 'ახლა ღია' : 'დახურულია'}
                    </Text>
                    {todayHours && !todayHours.isClosed && (
                      <Text style={styles.hoursInline}> · {todayHours.open}–{todayHours.close}</Text>
                    )}
                  </View>
                )}
              </View>
            </View>
            {rating > 0 && <ScoreBadge rating={rating} size="lg" />}
          </View>

          {/* Stars + reviews */}
          {rating > 0 && (
            <View style={styles.starsRow}>
              <StarRating rating={rating} size={16} />
              <Text style={styles.ratingNum}>{rating.toFixed(1)}</Text>
              {restaurant.reviewsCount !== undefined && restaurant.reviewsCount > 0 && (
                <Text style={styles.reviewCount}>· {restaurant.reviewsCount} შეფასება</Text>
              )}
            </View>
          )}
        </View>

        {/* ── Live wait time ── */}
        {waitTime !== null && (
          <View style={styles.waitRow}>
            <View style={[styles.waitBadge, waitTime <= 10 && styles.waitBadgeFast, waitTime >= 25 && styles.waitBadgeBusy]}>
              <Ionicons name="time-outline" size={13} color={waitTime >= 25 ? '#F97316' : waitTime <= 10 ? '#00C896' : COLORS.primary} />
              <Text style={[styles.waitText, waitTime >= 25 && { color: '#F97316' }, waitTime <= 10 && { color: '#00C896' }]}>
                {waitTime <= 10 ? 'თითქმის არ არის მოლოდინი' : `~${waitTime} წთ მოლოდინი`}
              </Text>
            </View>
            <View style={styles.busynessBar}>
              <View style={[styles.busynessFill, { width: `${Math.min(100, (waitTime / 35) * 100)}%` as any, backgroundColor: waitTime >= 25 ? '#F97316' : waitTime <= 10 ? '#00C896' : COLORS.primary }]} />
            </View>
          </View>
        )}

        {/* ── Quick actions ── */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.qaBtn} onPress={openMaps}>
            <View style={styles.qaIcon}><Ionicons name="navigate-outline" size={20} color={COLORS.primary} /></View>
            <Text style={styles.qaLabel}>მარშრუტი</Text>
          </TouchableOpacity>
          {restaurant.phone && (
            <TouchableOpacity style={styles.qaBtn} onPress={() => Linking.openURL(`tel:${restaurant.phone}`)}>
              <View style={styles.qaIcon}><Ionicons name="call-outline" size={20} color={COLORS.primary} /></View>
              <Text style={styles.qaLabel}>დარეკვა</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.qaBtn} onPress={handleShare}>
            <View style={styles.qaIcon}><Ionicons name="share-social-outline" size={20} color={COLORS.primary} /></View>
            <Text style={styles.qaLabel}>გაზიარება</Text>
          </TouchableOpacity>
        </View>

        {/* ── Address row ── */}
        <TouchableOpacity style={styles.addressRow} onPress={openMaps}>
          <Ionicons name="location-outline" size={16} color={COLORS.textMuted} />
          <Text style={styles.addressText}>{restaurant.address}</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* ── Tab bar ── */}
        <View
          style={styles.tabsOuter}
          onLayout={e => { tabY.current = e.nativeEvent.layout.y; }}
        >
          <View style={styles.tabs}>
            {(['info', 'menu', 'reviews'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => switchTab(tab)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'info' ? 'ინფო' : tab === 'menu' ? 'მენიუ' : 'შეფასებები'}
                </Text>
                {tab === 'reviews' && reviews.length > 0 && (
                  <View style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, activeTab === tab && styles.tabBadgeTextActive]}>{reviews.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Tab content ── */}
        <View style={styles.tabContent}>

          {/* INFO */}
          {activeTab === 'info' && (
            <View>
              {restaurant.description ? (
                <View style={styles.descBlock}>
                  <Text style={styles.desc}>{restaurant.description}</Text>
                </View>
              ) : null}

              {restaurant.workingHours && restaurant.workingHours.length > 0 && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>სამუშაო საათები</Text>
                  {restaurant.workingHours.map((wh) => (
                    <View key={wh.day} style={[styles.hourRow, wh.day === today && styles.hourRowToday]}>
                      <Text style={[styles.dayName, wh.day === today && styles.dayNameToday]}>{DAYS_GE[wh.day]}</Text>
                      <Text style={[styles.hourText, wh.isClosed && styles.hourClosed]}>
                        {wh.isClosed ? 'დახურულია' : `${wh.open} – ${wh.close}`}
                      </Text>
                      {wh.day === today && <View style={styles.todayDot} />}
                    </View>
                  ))}
                </View>
              )}

              {discount && (
                <View style={styles.offerBlock}>
                  <Ionicons name="pricetag-outline" size={18} color={COLORS.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offerTitle}>{discount}% ფასდაკლება</Text>
                    <Text style={styles.offerSub}>ჯავშნის გაკეთებისას</Text>
                  </View>
                </View>
              )}

              {events.length > 0 && (
                <View style={styles.eventsBlock}>
                  <Text style={styles.eventsSectionTitle}>ღონისძიებები</Text>
                  {events.map(e => (
                    <View key={e.id} style={styles.eventCard}>
                      <Text style={{ fontSize: 28 }}>{e.emoji || '🎉'}</Text>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.eventTitle}>{e.title}</Text>
                        {e.description ? <Text style={styles.eventDesc} numberOfLines={2}>{e.description}</Text> : null}
                        {e.eventDate ? (
                          <View style={styles.eventDateBadge}>
                            <Ionicons name="calendar-outline" size={11} color={COLORS.primary} />
                            <Text style={styles.eventDateText}>{e.eventDate}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* MENU */}
          {activeTab === 'menu' && (
            <View>
              {menu.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="restaurant-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>მენიუ ხელმიუწვდომელია</Text>
                </View>
              ) : (
                <>
                  {menu.length > 1 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.menuCatChips}>
                      <TouchableOpacity
                        style={[styles.menuCatChip, activeMenuCat === null && styles.menuCatChipActive]}
                        onPress={() => setActiveMenuCat(null)}
                      >
                        <Text style={[styles.menuCatChipText, activeMenuCat === null && styles.menuCatChipTextActive]}>ყველა</Text>
                      </TouchableOpacity>
                      {menu.map(cat => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.menuCatChip, activeMenuCat === cat.id && styles.menuCatChipActive]}
                          onPress={() => setActiveMenuCat(cat.id)}
                        >
                          <Text style={[styles.menuCatChipText, activeMenuCat === cat.id && styles.menuCatChipTextActive]}>{cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  {menu.filter(cat => activeMenuCat === null || cat.id === activeMenuCat).map(cat => (
                    <View key={cat.id} style={styles.menuCat}>
                      <Text style={styles.catName}>{cat.name}</Text>
                      {cat.items?.map(item => (
                        <View key={item.id} style={styles.menuItem}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            {item.description ? <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text> : null}
                          </View>
                          {item.photoUrl && (
                            <Image source={{ uri: item.photoUrl }} style={styles.itemImg} />
                          )}
                          <Text style={styles.itemPrice}>{item.price} ₾</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {/* REVIEWS */}
          {activeTab === 'reviews' && (
            <View>
              {/* Score summary + histogram */}
              {reviews.length > 0 && (
                <View style={styles.reviewSummary}>
                  <View style={styles.reviewSummaryScore}>
                    <Text style={[styles.summaryScoreNum, { color: scoreColor }]}>{score}</Text>
                    <Text style={styles.summaryScoreLabel}>/ 5</Text>
                    <StarRating rating={rating} size={14} />
                    <Text style={styles.summaryReviewCount}>{reviews.length} შეფ.</Text>
                  </View>
                  <View style={styles.histogram}>
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = reviews.filter(r => Math.round(r.rating) === star).length;
                      const pct = reviews.length > 0 ? count / reviews.length : 0;
                      return (
                        <View key={star} style={styles.histRow}>
                          <Text style={styles.histStar}>{star}</Text>
                          <Ionicons name="star" size={10} color={COLORS.star} />
                          <View style={styles.histBarBg}>
                            <View style={[styles.histBarFill, { width: `${pct * 100}%` as any }]} />
                          </View>
                          <Text style={styles.histCount}>{count}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.addReviewBtn}
                onPress={() => requireAuth(() => navigation.navigate('ReviewCreate', { restaurantId: id }))}
              >
                <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                <Text style={styles.addReviewText}>შეფასების დამატება</Text>
              </TouchableOpacity>

              {reviews.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="chatbubble-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>შეფასება ჯერ არ არის</Text>
                  <Text style={styles.emptySub}>იყავი პირველი ვინც დატოვებს შეფასებას</Text>
                </View>
              ) : (
                reviews.map(rev => {
                  const revRating = Number(rev.rating) || 0;
                  const revColor = revRating >= 4.5 ? '#00C896' : revRating >= 3.5 ? '#F59E0B' : COLORS.textSecondary;
                  const displayName = rev.user?.name || rev.reviewerName || 'მომხმარებელი';
                  const initial = displayName[0]?.toUpperCase() || '?';
                  return (
                    <View key={rev.id} style={styles.reviewCard}>
                      <View style={styles.reviewCardHeader}>
                        <View style={styles.reviewAvatar}>
                          <Text style={styles.reviewAvatarText}>{initial}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reviewUser}>{displayName}</Text>
                          <Text style={styles.reviewDate}>{new Date(rev.createdAt).toLocaleDateString('ka-GE')}</Text>
                        </View>
                        <View style={[styles.reviewScore, { backgroundColor: revColor + '22' }]}>
                          <Ionicons name="star" size={11} color={revColor} />
                          <Text style={[styles.reviewScoreText, { color: revColor }]}>{revRating.toFixed(1)}</Text>
                        </View>
                      </View>
                      {rev.comment ? <Text style={styles.reviewComment}>{rev.comment}</Text> : null}
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* ── Footer CTA ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || SPACING.md }]}>
        {discount && (
          <View style={styles.footerDiscount}>
            <Ionicons name="pricetag" size={14} color={COLORS.primary} />
            <Text style={styles.footerDiscountText}>{discount}% ფასდაკლება ჯავშნისთვის</Text>
          </View>
        )}
        <Button
          label="მაგიდის დაჯავშნა"
          onPress={() => requireAuth(() => navigation.navigate('Booking', { restaurantId: id, restaurantName: restaurant.name }))}
        />
      </View>

      {/* Fullscreen gallery */}
      <Modal visible={galleryVisible} transparent animationType="fade" onRequestClose={() => setGalleryVisible(false)}>
        <View style={styles.gallery}>
          <TouchableOpacity style={[styles.galleryClose, { top: (insets.top || 16) + 8 }]} onPress={() => setGalleryVisible(false)}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <FlatList
            data={allPhotos.length > 0 ? allPhotos : (coverUri ? [{ id: 'cover', url: coverUri } as any] : [])}
            horizontal pagingEnabled
            initialScrollIndex={photoIndex}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={p => p.id}
            renderItem={({ item }) => (
              <Image source={{ uri: item.url }} style={styles.galleryImg} resizeMode="contain" />
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  handle: { alignItems: 'center', paddingTop: 10, paddingBottom: 4, backgroundColor: COLORS.background },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border },

  // Hero
  heroGradientTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 110 },
  heroGradientBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  heroImg: { width, height: HERO_HEIGHT },
  heroPlaceholder: { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  dotRow: { position: 'absolute', bottom: 14, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { backgroundColor: '#fff', width: 18 },
  discountBanner: { position: 'absolute', top: 16, left: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  discountBannerText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  photoCount: { position: 'absolute', bottom: 14, right: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full },
  photoCountText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  closeBtn: { position: 'absolute', top: 14, left: SPACING.md, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: RADIUS.full, padding: 8 },
  heroActions: { position: 'absolute', top: 14, right: SPACING.md, flexDirection: 'row', gap: 8 },
  heroActionBtn: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: RADIUS.full, padding: 8 },

  // Info
  infoSection: { backgroundColor: COLORS.surface, padding: SPACING.md, paddingBottom: SPACING.sm },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.sm },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.text, lineHeight: 28 },
  nameSubRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  cuisine: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  openPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: RADIUS.full },
  openPillOpen: { backgroundColor: '#00C89622' },
  openPillClosed: { backgroundColor: COLORS.error + '22' },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  openText: { fontSize: 12, fontWeight: '700' },
  hoursInline: { fontSize: 11, color: COLORS.textMuted },
  scoreBig: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scoreBigText: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 20 },
  scoreBigLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  ratingNum: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  reviewCount: { fontSize: 13, color: COLORS.textMuted },

  // Quick actions
  waitRow: { backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  waitBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  waitBadgeFast: {},
  waitBadgeBusy: {},
  waitText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  busynessBar: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  busynessFill: { height: 4, borderRadius: 2 },
  quickActions: { flexDirection: 'row', backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: SPACING.md },
  qaBtn: { flex: 1, alignItems: 'center', gap: 6 },
  qaIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  // Address
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 14, backgroundColor: COLORS.surface },
  addressText: { flex: 1, fontSize: 14, color: COLORS.textSecondary },
  divider: { height: 8, backgroundColor: COLORS.background },

  // Tabs
  tabsOuter: { backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.full, padding: 3 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: RADIUS.full, gap: 5 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700' },
  tabTextActive: { color: '#fff', fontWeight: '800' },
  tabBadge: { backgroundColor: COLORS.primary + '33', paddingHorizontal: 6, paddingVertical: 1, borderRadius: RADIUS.full },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { fontSize: 10, color: COLORS.primary, fontWeight: '800' },
  tabBadgeTextActive: { color: '#fff' },
  tabContent: { paddingBottom: 120 },

  // Info tab
  descBlock: { padding: SPACING.md, backgroundColor: COLORS.surface, marginBottom: 8 },
  desc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  block: { backgroundColor: COLORS.surface, padding: SPACING.md, marginBottom: 8 },
  blockTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  hourRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  hourRowToday: { backgroundColor: COLORS.primaryLight + '44' },
  dayName: { fontSize: 14, color: COLORS.textSecondary, width: 50, fontWeight: '600' },
  dayNameToday: { color: COLORS.primary, fontWeight: '800' },
  hourText: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  hourClosed: { color: COLORS.textMuted },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  offerBlock: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, margin: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.primary + '44' },
  offerTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  offerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  eventsBlock: { margin: SPACING.md, gap: SPACING.sm },
  eventsSectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  eventCard: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  eventTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  eventDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  eventDateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: COLORS.primary + '18', paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full },
  eventDateText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  // Menu tab
  menuCatChips: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: 8 },
  menuCatChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceElevated, borderWidth: 1.5, borderColor: COLORS.border },
  menuCatChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  menuCatChipText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  menuCatChipTextActive: { color: '#fff' },
  menuCat: { backgroundColor: COLORS.surface, marginBottom: 8 },
  catName: { fontSize: 14, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: SPACING.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemName: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  itemDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  itemImg: { width: 60, height: 60, borderRadius: RADIUS.md },
  itemPrice: { fontSize: 14, fontWeight: '800', color: COLORS.primary, minWidth: 40, textAlign: 'right' },

  // Reviews tab
  reviewSummary: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surface, marginBottom: 8 },
  reviewSummaryScore: { alignItems: 'center', gap: 2, minWidth: 64 },
  summaryScoreNum: { fontSize: 40, fontWeight: '900', lineHeight: 44 },
  summaryScoreLabel: { fontSize: 13, color: COLORS.textMuted },
  summaryReviewCount: { fontSize: 11, color: COLORS.textMuted },
  histogram: { flex: 1, gap: 4 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  histStar: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '700', width: 10, textAlign: 'right' },
  histBarBg: { flex: 1, height: 6, backgroundColor: COLORS.surfaceElevated, borderRadius: 3, overflow: 'hidden' },
  histBarFill: { height: '100%', backgroundColor: COLORS.star, borderRadius: 3 },
  histCount: { fontSize: 10, color: COLORS.textMuted, width: 16, textAlign: 'right' },
  addReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, marginBottom: 8, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  addReviewText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  reviewCard: { backgroundColor: COLORS.surface, padding: SPACING.md, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  reviewAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  reviewAvatarText: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  reviewUser: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  reviewDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  reviewScore: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm },
  reviewScoreText: { fontSize: 13, fontWeight: '800' },
  reviewComment: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },

  // Empty states
  emptyWrap: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textSecondary },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, paddingTop: SPACING.sm, paddingHorizontal: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  footerDiscount: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  footerDiscountText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },

  // Gallery
  gallery: { flex: 1, backgroundColor: 'rgba(0,0,0,0.97)', justifyContent: 'center' },
  galleryClose: { position: 'absolute', right: SPACING.md, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: RADIUS.full },
  galleryImg: { width, height: '100%' },
});
