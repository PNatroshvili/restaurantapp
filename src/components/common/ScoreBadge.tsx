import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../../constants';

const scoreColor = (rating: number) =>
  rating >= 4.5 ? COLORS.scoreGood : rating >= 3.5 ? COLORS.scoreMid : COLORS.textMuted;

interface Props {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function ScoreBadge({ rating, size = 'md' }: Props) {
  if (rating <= 0) return null;
  const color = scoreColor(rating);
  const s = SIZE[size];
  return (
    <View style={[styles.badge, { backgroundColor: color, paddingHorizontal: s.px, paddingVertical: s.py, borderRadius: s.radius }]}>
      <Text style={[styles.text, { fontSize: s.font }]}>{rating.toFixed(1)}</Text>
    </View>
  );
}

const SIZE = {
  sm: { px: 7,  py: 3,  font: 11, radius: RADIUS.sm },
  md: { px: 10, py: 5,  font: 13, radius: RADIUS.md },
  lg: { px: 14, py: 7,  font: 16, radius: RADIUS.md },
};

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontFamily: FONTS.black },
});
