import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import FadeSlideIn from '../../components/common/FadeSlideIn';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { COLORS, SPACING, RADIUS } from '../../constants';
import { RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const BUILD = Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '1';

const INFO_ROWS = [
  { label: 'ვერსია', value: `v${APP_VERSION}` },
  { label: 'Build', value: String(BUILD) },
  { label: 'პლატფორმა', value: 'Android / iOS' },
  { label: 'კომპანია', value: 'SKUP Georgia' },
  { label: 'ვებსაიტი', value: 'www.skup.ge', link: 'https://skup.ge' },
  { label: 'მხარდაჭერა', value: 'support@skup.ge', link: 'mailto:support@skup.ge' },
];

export default function AboutScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>აპლიკაციის შესახებ</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Logo area */}
        <FadeSlideIn delay={0}>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Ionicons name="restaurant" size={42} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>SKUP Restaurants</Text>
          <Text style={styles.appTagline}>სარესტორნო ჯავშნები თბილისში</Text>
        </View>
        </FadeSlideIn>

        {/* Info cards */}
        <FadeSlideIn delay={80}>
        <View style={styles.card}>
          {INFO_ROWS.map((row, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.row, i < INFO_ROWS.length - 1 && styles.rowBorder]}
              onPress={() => row.link && Linking.openURL(row.link)}
              activeOpacity={row.link ? 0.7 : 1}
            >
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={[styles.rowValue, row.link && styles.rowLink]}>{row.value}</Text>
            </TouchableOpacity>
          ))}
        </View>
        </FadeSlideIn>

        {/* Legal links */}
        <FadeSlideIn delay={160}>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.row, styles.rowBorder]}
            onPress={() => navigation.navigate('Privacy')}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>კონფიდენციალობის პოლიტიკა</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('Terms')}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>გამოყენების პირობები</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
        </FadeSlideIn>

        <Text style={styles.copy}>© 2026 SKUP Georgia. ყველა უფლება დაცულია.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  content: { padding: SPACING.md, gap: SPACING.lg, paddingBottom: 40 },
  logoWrap: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  logoCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.primary + '33' },
  appName: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  appTagline: { fontSize: 13, color: COLORS.textSecondary },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  rowValue: { fontSize: 13, color: COLORS.textSecondary },
  rowLink: { color: COLORS.primary },
  copy: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontStyle: 'italic' },
});
