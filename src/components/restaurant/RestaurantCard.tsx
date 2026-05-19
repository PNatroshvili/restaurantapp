import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { Restaurant, RootStackParamList } from '../../types';
import { COLORS, RADIUS, SPACING } from '../../constants';

interface Props {
  restaurant: Restaurant;
  horizontal?: boolean;
  discount?: number | null;
  tag?: string;
}

export default function RestaurantCard({ restaurant, horizontal = false, discount, tag }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 2 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  const onPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('RestaurantDetail', { id: restaurant.id });
  };

  const call = (e: any) => {
    e.stopPropagation();
    if (!restaurant.phone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${restaurant.phone}`);
  };

  const coverUri =
    restaurant.cover_photo ||
    restaurant.coverPhoto ||
    restaurant.photos?.find(p => p.isCover)?.url ||
    restaurant.photos?.[0]?.url;

  const rating = Number(restaurant.ratingAvg) || 0;
  const score = rating.toFixed(1);
  const scoreColor = rating >= 4.5 ? COLORS.scoreGood : rating >= 3.5 ? COLORS.scoreMid : COLORS.textMuted;
  const isOpen = restaurant.isOpen;

  const distanceText = restaurant.distance
    ? restaurant.distance < 1000
      ? `${Math.round(restaurant.distance)}მ`
      : `${(restaurant.distance / 1000).toFixed(1)}კმ`
    : null;

  // ── Horizontal row card ──────────────────────────────────────────────────
  if (horizontal) {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={styles.cardH}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={1}
        >
          <View style={styles.imgWrapH}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.imgH} contentFit="cover" transition={200} />
            ) : (
              <View style={[styles.imgH, styles.imgPlaceholder]}>
                <Ionicons name="restaurant" size={22} color={COLORS.textMuted} />
              </View>
            )}
            {discount && (
              <View style={styles.discountBadgeH}>
                <Text style={styles.discountTextSmall}>-{discount}%</Text>
              </View>
            )}
          </View>

          <View style={styles.bodyH}>
            <Text style={styles.nameH} numberOfLines={1}>{restaurant.name}</Text>
            {restaurant.cuisine && (
              <Text style={styles.cuisineH} numberOfLines={1}>{restaurant.cuisine.name}</Text>
            )}
            <View style={styles.metaRowH}>
              {isOpen !== undefined && (
                <>
                  <View style={[styles.statusDot, { backgroundColor: isOpen ? COLORS.scoreGood : COLORS.error }]} />
                  <Text style={[styles.statusTextH, { color: isOpen ? COLORS.scoreGood : COLORS.error }]}>
                    {isOpen ? 'ღია' : 'დახ.'}
                  </Text>
                </>
              )}
              {distanceText && (
                <>
                  <Text style={styles.dotSep}>·</Text>
                  <Ionicons name="navigate-outline" size={10} color={COLORS.textMuted} />
                  <Text style={styles.distTextH}>{distanceText}</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.rightColH}>
            {rating > 0 && (
              <View style={[styles.scorePillH, { borderColor: scoreColor + '55' }]}>
                <Text style={[styles.scoreNumH, { color: scoreColor }]}>{score}</Text>
              </View>
            )}
            {restaurant.phone && (
              <TouchableOpacity style={styles.callBtnH} onPress={call} activeOpacity={0.75}>
                <Ionicons name="call" size={13} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── Vertical editorial card ──────────────────────────────────────────────
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Background photo */}
        {coverUri ? (
          <Image
            source={{ uri: coverUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={280}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.photoPlaceholder]}>
            <Ionicons name="restaurant" size={40} color={COLORS.textMuted} />
          </View>
        )}

        {/* Bottom gradient overlay — 10 strips simulating a smooth gradient */}
        <View style={styles.gradient} pointerEvents="none">
          {[0, 0.04, 0.1, 0.18, 0.28, 0.4, 0.54, 0.68, 0.8, 0.9].map((opacity, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: `rgba(0,0,0,${opacity})` }} />
          ))}
        </View>

        {/* Top-left badges */}
        <View style={styles.topLeft}>
          {discount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}
          {tag && (
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          )}
        </View>

        {/* Score badge — top right */}
        {rating > 0 && (
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
            <Text style={styles.scoreText}>{score}</Text>
          </View>
        )}

        {/* Bottom content on photo */}
        <View style={styles.bottomContent}>
          <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
          <View style={styles.metaRow}>
            {restaurant.cuisine && (
              <View style={styles.cuisinePill}>
                <Text style={styles.cuisineText}>{restaurant.cuisine.name}</Text>
              </View>
            )}
            {isOpen !== undefined && (
              <View style={[styles.statusPill, { backgroundColor: isOpen ? 'rgba(0,212,168,0.22)' : 'rgba(239,68,68,0.22)' }]}>
                <View style={[styles.statusDotV, { backgroundColor: isOpen ? COLORS.scoreGood : COLORS.error }]} />
                <Text style={[styles.statusTxtV, { color: isOpen ? COLORS.scoreGood : COLORS.error }]}>
                  {isOpen ? 'ღია' : 'დახ.'}
                </Text>
              </View>
            )}
            {distanceText && (
              <View style={styles.distPill}>
                <Ionicons name="navigate" size={9} color="rgba(255,255,255,0.65)" />
                <Text style={styles.distTxt}>{distanceText}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // ── Vertical card ──
  card: {
    width: 205,
    height: 258,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceElevated,
  },
  photoPlaceholder: {
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 170,
  },
  topLeft: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    gap: 5,
  },
  discountBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  discountText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  tagBadge: {
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  tagText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  scoreBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
  },
  scoreText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.sm,
    paddingBottom: 14,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 7,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  cuisinePill: {
    backgroundColor: 'rgba(0,182,122,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(0,182,122,0.4)',
  },
  cuisineText: { fontSize: 10, color: COLORS.primary, fontWeight: '700' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  statusDotV: { width: 5, height: 5, borderRadius: 3 },
  statusTxtV: { fontSize: 10, fontWeight: '700' },
  distPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  distTxt: { fontSize: 10, color: 'rgba(255,255,255,0.72)', fontWeight: '600' },

  // ── Horizontal card ──
  cardH: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    height: 90,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imgWrapH: { width: 90, position: 'relative' },
  imgH: { width: '100%', height: '100%' },
  imgPlaceholder: {
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadgeH: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  discountTextSmall: { color: '#fff', fontSize: 10, fontWeight: '800' },
  bodyH: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    justifyContent: 'center',
    gap: 3,
  },
  nameH: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  cuisineH: { fontSize: 11, color: COLORS.textSecondary },
  metaRowH: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTextH: { fontSize: 11, fontWeight: '700' },
  dotSep: { fontSize: 11, color: COLORS.textMuted },
  distTextH: { fontSize: 11, color: COLORS.textMuted },
  rightColH: {
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  scorePillH: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    minWidth: 38,
    alignItems: 'center',
  },
  scoreNumH: { fontSize: 13, fontWeight: '900' },
  callBtnH: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
  },
});
