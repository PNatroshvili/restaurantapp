import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function Button({ label, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      style={[styles.base, isPrimary && styles.primary, isOutline && styles.outline, (disabled || loading) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? COLORS.white : COLORS.primary} size="small" />
      ) : (
        <Text style={[styles.label, isPrimary && styles.labelPrimary, isOutline && styles.labelOutline]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  primary: { backgroundColor: COLORS.primary },
  outline: { borderWidth: 1.5, borderColor: COLORS.primary },
  disabled: { opacity: 0.5 },
  label: { fontSize: 15, fontWeight: '600' },
  labelPrimary: { color: COLORS.white },
  labelOutline: { color: COLORS.primary },
});
