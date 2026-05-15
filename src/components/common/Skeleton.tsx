import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants';

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function Skeleton({ width = '100%', height = 16, borderRadius = RADIUS.sm, style }: Props) {
  const shimmerX = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerX, {
        toValue: 600,
        duration: 1400,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();
  }, []);

  return (
    <View style={[{ width: width as any, height, borderRadius, backgroundColor: COLORS.surfaceElevated, overflow: 'hidden' }, style]}>
      <Animated.View
        style={{
          position: 'absolute', top: 0, bottom: 0, width: 140,
          backgroundColor: 'rgba(255,255,255,0.055)',
          transform: [{ translateX: shimmerX }],
        }}
      />
    </View>
  );
}

export function SkeletonCard({ fullWidth }: { fullWidth?: boolean }) {
  return (
    <View style={[cardStyles.wrap, fullWidth && { width: '100%' }]}>
      <Skeleton height={180} borderRadius={0} />
      <View style={cardStyles.body}>
        <Skeleton height={18} width="70%" style={{ marginBottom: 8 }} />
        <Skeleton height={13} width="40%" style={{ marginBottom: 12 }} />
        <View style={cardStyles.row}>
          <Skeleton height={13} width="30%" />
          <Skeleton height={13} width="25%" />
        </View>
      </View>
    </View>
  );
}

export function SkeletonRestaurantRow() {
  return (
    <View style={rowStyles.wrap}>
      <Skeleton width={110} height={90} borderRadius={RADIUS.md} />
      <View style={rowStyles.body}>
        <Skeleton height={16} width="65%" style={{ marginBottom: 8 }} />
        <Skeleton height={12} width="40%" style={{ marginBottom: 8 }} />
        <Skeleton height={12} width="55%" />
      </View>
    </View>
  );
}

export function SkeletonProfile() {
  return (
    <View style={profileStyles.wrap}>
      <View style={profileStyles.header}>
        <Skeleton width={84} height={84} borderRadius={42} style={{ alignSelf: 'center', marginBottom: 12 }} />
        <Skeleton height={20} width="40%" style={{ alignSelf: 'center', marginBottom: 8 }} />
        <Skeleton height={14} width="30%" style={{ alignSelf: 'center', marginBottom: 24 }} />
        <View style={profileStyles.statsRow}>
          <Skeleton height={40} width="28%" borderRadius={RADIUS.md} />
          <Skeleton height={40} width="28%" borderRadius={RADIUS.md} />
          <Skeleton height={40} width="28%" borderRadius={RADIUS.md} />
        </View>
      </View>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={profileStyles.row}>
          <Skeleton width={20} height={20} borderRadius={10} />
          <Skeleton height={16} width="60%" />
        </View>
      ))}
    </View>
  );
}

export function SkeletonRestaurantDetail() {
  return (
    <View style={detailStyles.root}>
      <View style={detailStyles.handle}><View style={detailStyles.handleBar} /></View>
      <Skeleton height={280} borderRadius={0} />
      <View style={detailStyles.infoSection}>
        <View style={detailStyles.nameRow}>
          <View style={{ flex: 1, gap: 10 }}>
            <Skeleton height={24} width="70%" />
            <Skeleton height={14} width="40%" />
          </View>
          <Skeleton width={52} height={52} borderRadius={14} />
        </View>
        <Skeleton height={14} width="50%" style={{ marginTop: 8 }} />
      </View>
      <View style={detailStyles.quickActions}>
        {[1, 2, 3].map(i => (
          <View key={i} style={detailStyles.qaItem}>
            <Skeleton width={44} height={44} borderRadius={22} />
            <Skeleton height={11} width={44} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
      <View style={detailStyles.addressRow}>
        <Skeleton height={14} width="75%" />
      </View>
      <View style={detailStyles.tabBar}>
        <Skeleton height={36} borderRadius={RADIUS.full} />
      </View>
      <View style={detailStyles.content}>
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} height={14} width={i % 3 === 0 ? '60%' : '100%'} style={{ marginBottom: 12 }} />
        ))}
      </View>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  handle: { alignItems: 'center', paddingTop: 10, paddingBottom: 4, backgroundColor: COLORS.background },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  infoSection: { backgroundColor: COLORS.surface, padding: SPACING.md, paddingBottom: SPACING.md },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  quickActions: { flexDirection: 'row', backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: SPACING.md },
  qaItem: { flex: 1, alignItems: 'center' },
  addressRow: { backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: 14 },
  tabBar: { backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  content: { padding: SPACING.md, backgroundColor: COLORS.surface, marginTop: 8 },
});

const cardStyles = StyleSheet.create({
  wrap: { width: 200, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  body: { padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});

const rowStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 12, backgroundColor: COLORS.surface, padding: 12, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  body: { flex: 1, justifyContent: 'center' },
});

const profileStyles = StyleSheet.create({
  wrap: { flex: 1 },
  header: { backgroundColor: COLORS.surface, padding: 24, marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, padding: 16, marginHorizontal: 16, marginBottom: 8, borderRadius: RADIUS.md },
});
