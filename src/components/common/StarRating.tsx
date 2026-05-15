import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants';

interface Props {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export default function StarRating({ rating, size = 16, interactive = false, onRate }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(rating);
        return interactive ? (
          <TouchableOpacity key={star} onPress={() => onRate?.(star)}>
            <Ionicons name={filled ? 'star' : 'star-outline'} size={size} color={COLORS.star} />
          </TouchableOpacity>
        ) : (
          <Ionicons key={star} name={filled ? 'star' : 'star-outline'} size={size} color={COLORS.star} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
});
