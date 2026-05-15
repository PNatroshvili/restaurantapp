import React, { useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Modal, Animated, Dimensions, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Restaurant, RootStackParamList } from '../../types';
import { COLORS, RADIUS, SPACING } from '../../constants';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.52;

interface Props {
  restaurant: Restaurant | null;
  onClose: () => void;
  onBook: () => void;
}

export default function RestaurantSheet({ restaurant, onClose, onBook }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const translateY = useRef(new Animated.Value(SHEET_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const visible = !!restaurant;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SHEET_H, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleViewFull = () => {
    if (!restaurant) return;
    onClose();
    navigation.navigate('RestaurantDetail', { id: restaurant.id });
  };

  if (!restaurant && !visible) return null;

  const coverUri = restaurant?.cover_photo || restaurant?.coverPhoto || restaurant?.photos?.[0]?.url;
  const rating = Number(restaurant?.ratingAvg) || 0;
  const score = (rating * 2).toFixed(1);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Photo */}
        <View style={styles.imgWrap}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.img} />
          ) : (
            <View style={[styles.img, styles.imgPlaceholder]}>
              <Ionicons name="restaurant" size={48} color={COLORS.textMuted} />
            </View>
          )}
          {rating > 0 && (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{score}</Text>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Name & cuisine */}
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{restaurant?.name}</Text>
              {restaurant?.cuisine && <Text style={styles.cuisine}>{restaurant.cuisine.name}</Text>}
            </View>
            {restaurant?.isOpen !== undefined && (
              <View style={[styles.statusBadge, restaurant.isOpen ? styles.open : styles.closed]}>
                <Text style={styles.statusText}>{restaurant.isOpen ? 'ღია' : 'დახურული'}</Text>
              </View>
            )}
          </View>

          {/* Address */}
          {restaurant?.address && (
            <TouchableOpacity
              style={styles.metaRow}
              onPress={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`;
                Linking.openURL(url);
              }}
            >
              <Ionicons name="location-outline" size={14} color={COLORS.primary} />
              <Text style={styles.metaText} numberOfLines={1}>{restaurant.address}</Text>
            </TouchableOpacity>
          )}

          {/* Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnOutline} onPress={handleViewFull}>
              <Text style={styles.btnOutlineText}>სრული ინფო</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={onBook}>
              <Text style={styles.btnPrimaryText}>დაჯავშნა</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_H,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  imgWrap: { height: 180, position: 'relative' },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  scoreBadge: { position: 'absolute', bottom: 10, right: 12, backgroundColor: COLORS.score, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm },
  scoreText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },
  body: { padding: SPACING.md, paddingBottom: SPACING.xl },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  cuisine: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, marginLeft: SPACING.sm },
  open: { backgroundColor: 'rgba(0,200,150,0.18)' },
  closed: { backgroundColor: 'rgba(239,68,68,0.18)' },
  statusText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.md },
  metaText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  btnOutline: { flex: 1, height: 48, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  btnOutlineText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  btnPrimary: { flex: 1, height: 48, borderRadius: RADIUS.full, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
});
