import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACING } from '../../constants';

export interface SignatureDish {
  key: string;
  name: string;       // Georgian
  latin: string;      // For tourists
  image: string;
  rating: number;
  votes: number;
  accent: string;     // Card accent color
  searchQuery: string;
}

export const GEORGIAN_DISHES: SignatureDish[] = [
  { key: 'khachapuri', name: 'ხაჭაპური',    latin: 'Khachapuri',       image: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?w=400', rating: 4.9, votes: 2840, accent: '#E67E22', searchQuery: 'ხაჭაპური' },
  { key: 'khinkali',   name: 'ხინკალი',     latin: 'Khinkali',         image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400', rating: 4.8, votes: 2310, accent: '#8E44AD', searchQuery: 'ხინკალი' },
  { key: 'mtsvadi',    name: 'მწვადი',      latin: 'Mtsvadi',          image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400', rating: 4.7, votes: 1920, accent: '#C0392B', searchQuery: 'მწვადი' },
  { key: 'mushrooms',  name: 'სოკო კეცზე', latin: 'Mushrooms on Keci', image: 'https://images.unsplash.com/photo-1504718855392-c0f33b372e72?w=400', rating: 4.6, votes: 1450, accent: '#27AE60', searchQuery: 'სოკო' },
  { key: 'kanchi',     name: 'კანჭი',       latin: 'Kanchi',           image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', rating: 4.7, votes: 1680, accent: '#2980B9', searchQuery: 'კანჭი' },
];

interface Props {
  dish: SignatureDish;
  onPress: (dish: SignatureDish) => void;
}

export default function SignatureDishCard({ dish, onPress }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 60, bounciness: 2 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  const stars = Math.round(dish.rating);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.card, { borderColor: dish.accent + '55' }]}
        onPress={() => onPress(dish)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Top accent strip */}
        <View style={[styles.accentStrip, { backgroundColor: dish.accent }]} />

        {/* Dish photo with badge overlay */}
        <View style={styles.imageWrapper}>
          <Image source={{ uri: dish.image }} style={styles.dishImage} />
          <View style={styles.touristBadge}>
            <Text style={styles.touristText}>🇬🇪 Must Try</Text>
          </View>
        </View>

        {/* Names */}
        <Text style={styles.name}>{dish.name}</Text>
        <Text style={styles.latin}>{dish.latin}</Text>

        {/* Stars */}
        <View style={styles.starsRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Ionicons key={i} name={i < stars ? 'star' : 'star-outline'} size={11} color="#FFB800" />
          ))}
          <Text style={styles.ratingNum}>{dish.rating.toFixed(1)}</Text>
        </View>

        {/* Vote count */}
        <Text style={styles.votes}>{dish.votes.toLocaleString()} შეფასება</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 152,
    backgroundColor: '#0F1828',
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
    paddingBottom: SPACING.md,
    alignItems: 'center',
  },
  accentStrip: { width: '100%', height: 3 },
  imageWrapper: { width: '100%', height: 96 },
  dishImage: { width: '100%', height: 96, resizeMode: 'cover' },
  touristBadge: {
    position: 'absolute',
    bottom: 6,
    left: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  touristText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  name: { fontSize: 15, fontWeight: '900', color: '#fff', textAlign: 'center', paddingHorizontal: SPACING.sm, marginTop: SPACING.sm, letterSpacing: -0.2 },
  latin: { fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: '500', marginTop: 2, textAlign: 'center', paddingHorizontal: SPACING.sm },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: SPACING.sm },
  ratingNum: { fontSize: 11, fontWeight: '800', color: '#FFB800', marginLeft: 3 },
  votes: { fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 3 },
});
