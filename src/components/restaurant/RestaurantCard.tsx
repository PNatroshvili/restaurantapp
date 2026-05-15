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
}

export default function RestaurantCard({ restaurant, horizontal = false, discount }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  const onPress = () => navigation.navigate('RestaurantDetail', { id: restaurant.id });

  const call = (e: any) => {
    e.stopPropagation();
    if (!restaurant.phone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${restaurant.phone}`);
  };

  const coverUri = restaurant.cover_photo || restaurant.coverPhoto || restaurant.photos?.find(p => p.isCover)?.url || restaurant.photos?.[0]?.url;
  const rating = Number(restaurant.ratingAvg) || 0;
  const score = (rating * 2).toFixed(1);
  const scoreNum = parseFloat(score);
  const scoreColor = scoreNum >= 9 ? '#00C896' : scoreNum >= 7 ? '#F59E0B' : COLORS.textMuted;
  const isOpen = restaurant.isOpen;

  const distanceText = restaurant.distance
    ? restaurant.distance < 1000
      ? `${Math.round(restaurant.distance)}მ`
      : `${(restaurant.distance / 1000).toFixed(1)}კმ`
    : null;

  if (horizontal) {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity style={styles.cardH} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
          <View style={styles.imgWrapH}>
            {coverUri
              ? <Image source={{ uri: coverUri }} style={styles.img} contentFit="cover" transition={200} />
              : <View style={[styles.img, styles.imgPlaceholder]}><Ionicons name="restaurant" size={22} color={COLORS.textMuted} /></View>
            }
            {discount && (
              <View style={styles.discountBadgeH}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            )}
          </View>
          <View style={styles.bodyH}>
            <Text style={styles.nameH} numberOfLines={1}>{restaurant.name}</Text>
            {restaurant.cuisine && <Text style={styles.cuisine}>{restaurant.cuisine.name}</Text>}
            <View style={styles.metaRow}>
              {distanceText && (
                <View style={styles.metaPill}>
                  <Ionicons name="location-outline" size={10} color={COLORS.textMuted} />
                  <Text style={styles.metaText}>{distanceText}</Text>
                </View>
              )}
              {isOpen !== undefined && (
                <View style={[styles.metaPill, { backgroundColor: isOpen ? '#00C89622' : COLORS.error + '22' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: isOpen ? '#00C896' : COLORS.error }}>
                    {isOpen ? 'ღია' : 'დახ.'}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.rightColH}>
            {rating > 0 && (
              <View style={[styles.scoreBadgeH, { backgroundColor: scoreColor }]}>
                <Text style={styles.scoreText}>{score}</Text>
              </View>
            )}
            {restaurant.phone && (
              <TouchableOpacity style={styles.callBtnH} onPress={call} activeOpacity={0.75}>
                <Ionicons name="call" size={14} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity style={styles.card} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
        <View style={styles.imgWrap}>
          {coverUri
            ? <Image source={{ uri: coverUri }} style={styles.img} contentFit="cover" transition={200} />
            : <View style={[styles.img, styles.imgPlaceholder]}><Ionicons name="restaurant" size={36} color={COLORS.textMuted} /></View>
          }
          {discount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}
          {rating > 0 && (
            <View style={[styles.scoreBadgeOverlay, { backgroundColor: scoreColor }]}>
              <Text style={styles.scoreText}>{score}</Text>
            </View>
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { flex: 1 }]} numberOfLines={1}>{restaurant.name}</Text>
            {restaurant.phone && (
              <TouchableOpacity style={styles.callBtn} onPress={call} activeOpacity={0.75}>
                <Ionicons name="call" size={13} color={COLORS.primary} />
                <Text style={styles.callBtnText}>დარეკვა</Text>
              </TouchableOpacity>
            )}
          </View>
          {restaurant.cuisine && <Text style={styles.cuisine}>{restaurant.cuisine.name}</Text>}
          <View style={styles.metaRow}>
            {distanceText && (
              <View style={styles.metaPill}>
                <Ionicons name="location-outline" size={10} color={COLORS.textMuted} />
                <Text style={styles.metaText}>{distanceText}</Text>
              </View>
            )}
            {isOpen !== undefined && (
              <View style={[styles.metaPill, { backgroundColor: isOpen ? '#00C89622' : COLORS.error + '22' }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: isOpen ? '#00C896' : COLORS.error }}>
                  {isOpen ? 'ღია' : 'დახურული'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', width: 220, borderWidth: 1, borderColor: COLORS.border },
  cardH: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', flexDirection: 'row', height: 90, borderWidth: 1, borderColor: COLORS.border },

  imgWrap: { height: 140, position: 'relative' },
  imgWrapH: { width: 100, position: 'relative' },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },

  discountBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  discountBadgeH: { position: 'absolute', top: 6, left: 6, backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm },
  discountText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  scoreBadgeOverlay: { position: 'absolute', bottom: 8, right: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  scoreBadgeH: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: RADIUS.sm },
  scoreText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  rightColH: { alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: SPACING.sm, paddingVertical: 8 },
  callBtnH: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.primary + '44' },

  body: { padding: SPACING.sm },
  bodyH: { flex: 1, padding: SPACING.sm, justifyContent: 'center' },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  nameH: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  cuisine: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },

  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.primary + '18', paddingHorizontal: 7, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary + '44' },
  callBtnText: { fontSize: 10, fontWeight: '800', color: COLORS.primary },

  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.surfaceElevated, paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.full },
  metaText: { fontSize: 10, color: COLORS.textMuted },
});
