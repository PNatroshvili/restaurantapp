import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Animated, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { Restaurant, RootStackParamList } from '../../types';
import { COLORS, RADIUS, SPACING } from '../../constants';

const SHEET_CONTENT_H = 340;

interface Props {
  restaurant: Restaurant | null;
  onClose: () => void;
  onBook: () => void;
}

// JS-only gradient strips (no native dependency)
function GradientOverlay() {
  const opacities = [0, 0.05, 0.14, 0.28, 0.45, 0.62, 0.78, 0.9];
  return (
    <View style={grad.wrap} pointerEvents="none">
      {opacities.map((o, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: `rgba(0,0,0,${o})` }} />
      ))}
    </View>
  );
}
const grad = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 },
});

export default function RestaurantSheet({ restaurant, onClose, onBook }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const SHEET_H = SHEET_CONTENT_H + insets.bottom;
  const translateY = useRef(new Animated.Value(SHEET_H + 40)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Cache last restaurant so exit animation renders while prop goes null
  const [cached, setCached] = useState<typeof restaurant>(restaurant);
  // Controls Modal visible — stays true until exit animation finishes
  const [modalVisible, setModalVisible] = useState(false);
  const visible = !!restaurant;

  useEffect(() => { if (restaurant) setCached(restaurant); }, [restaurant]);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 220 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SHEET_H + 40, duration: 240, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setModalVisible(false); });
    }
  }, [visible]);

  if (!modalVisible && !cached) return null;

  const coverUri = cached?.cover_photo || cached?.coverPhoto || cached?.photos?.[0]?.url;
  const rating = Number(cached?.ratingAvg) || 0;
  const score = rating.toFixed(1);
  const scoreColor = rating >= 4.5 ? COLORS.scoreGood : rating >= 3.5 ? COLORS.scoreMid : COLORS.textMuted;
  const isOpen = cached?.isOpen;

  const openMaps = () => {
    if (!cached?.address) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cached.address)}`);
  };

  const callPhone = () => {
    if (!cached?.phone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${cached.phone}`);
  };

  const handleViewFull = () => {
    if (!cached) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    navigation.navigate('RestaurantDetail', { id: cached.id });
  };

  const handleBook = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onBook();
  };

  return (
    <Modal transparent visible={modalVisible} animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Bottom sheet */}
      <Animated.View style={[styles.sheet, { height: SHEET_H, transform: [{ translateY }] }]}>
        {/* Drag handle */}
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        {/* Hero photo */}
        <View style={styles.photoWrap}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.photoPlaceholder]}>
              <Ionicons name="restaurant" size={44} color={COLORS.textMuted} />
            </View>
          )}

          <GradientOverlay />

          {/* Score badge */}
          {rating > 0 && (
            <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
              <Ionicons name="star" size={10} color="#fff" />
              <Text style={styles.scoreText}>{score}</Text>
            </View>
          )}

          {/* Name + cuisine on photo */}
          <View style={styles.photoBottom}>
            <Text style={styles.nameOnPhoto} numberOfLines={1}>{cached?.name}</Text>
            <View style={styles.photoMetaRow}>
              {cached?.cuisine && (
                <View style={styles.cuisinePill}>
                  <Text style={styles.cuisineText}>{cached.cuisine.name}</Text>
                </View>
              )}
              {isOpen !== undefined && (
                <View style={[styles.statusPill, { backgroundColor: isOpen ? 'rgba(0,212,168,0.25)' : 'rgba(239,68,68,0.25)' }]}>
                  <View style={[styles.statusDot, { backgroundColor: isOpen ? COLORS.scoreGood : COLORS.error }]} />
                  <Text style={[styles.statusText, { color: isOpen ? COLORS.scoreGood : COLORS.error }]}>
                    {isOpen ? 'ღია' : 'დახ.'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Info section */}
        <View style={[styles.info, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
          {/* Address row */}
          {cached?.address && (
            <TouchableOpacity style={styles.addrRow} onPress={openMaps} activeOpacity={0.75}>
              <View style={styles.addrIconWrap}>
                <Ionicons name="location-outline" size={15} color={COLORS.primary} />
              </View>
              <Text style={styles.addrText} numberOfLines={1}>{cached.address}</Text>
              <Ionicons name="open-outline" size={13} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}

          {/* Quick actions: Navigate + Call */}
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickBtn} onPress={openMaps} activeOpacity={0.8}>
              <Ionicons name="navigate-outline" size={16} color={COLORS.primary} />
              <Text style={styles.quickText}>მარშრუტი</Text>
            </TouchableOpacity>
            {cached?.phone && (
              <TouchableOpacity style={styles.quickBtn} onPress={callPhone} activeOpacity={0.8}>
                <Ionicons name="call-outline" size={16} color={COLORS.primary} />
                <Text style={styles.quickText}>დარეკვა</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.quickBtn, styles.quickBtnInfo]} onPress={handleViewFull} activeOpacity={0.8}>
              <Ionicons name="information-circle" size={17} color="#fff" />
              <Text style={[styles.quickText, styles.quickTextInfo]}>ინფო</Text>
            </TouchableOpacity>
          </View>

          {/* CTA */}
          <TouchableOpacity style={styles.bookBtn} onPress={handleBook} activeOpacity={0.88}>
            <Ionicons name="calendar-outline" size={17} color="#fff" />
            <Text style={styles.bookBtnText}>მაგიდის დაჯავშნა</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 2 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border },

  // Photo
  photoWrap: { height: 180, position: 'relative', backgroundColor: COLORS.surfaceElevated },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  scoreBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
  },
  scoreText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  photoBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.sm, paddingBottom: 12 },
  nameOnPhoto: { fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 6, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  photoMetaRow: { flexDirection: 'row', gap: 6 },
  cuisinePill: { backgroundColor: 'rgba(0,182,122,0.28)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(0,182,122,0.4)' },
  cuisineText: { fontSize: 10, color: COLORS.primary, fontWeight: '700' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },

  // Info
  info: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, gap: SPACING.sm },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceElevated, padding: 10, borderRadius: RADIUS.lg },
  addrIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center' },
  addrText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },

  quickRow: { flexDirection: 'row', gap: SPACING.sm },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  quickBtnInfo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, flex: 1.3 },
  quickText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  quickTextInfo: { color: '#fff', fontSize: 12 },

  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14 },
  bookBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
