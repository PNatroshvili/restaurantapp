import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../../constants';

interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.root}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.title}>რაღაც არასწორად წავიდა</Text>
        <Text style={styles.sub}>
          {this.state.error?.message || 'გაუთვალისწინებელი შეცდომა'}
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => this.setState({ hasError: false, error: undefined })}
        >
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={styles.btnText}>ხელახლა ცდა</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, backgroundColor: COLORS.background, gap: SPACING.md },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  sub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: 12, borderRadius: RADIUS.full, marginTop: SPACING.sm },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
