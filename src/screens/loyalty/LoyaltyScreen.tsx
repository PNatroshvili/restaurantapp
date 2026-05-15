import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../../constants';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';

const TIERS = [
  { name: 'ბრინჯაო', min: 0, max: 499, color: '#CD7F32', emoji: '🥉' },
  { name: 'ვერცხლი', min: 500, max: 1499, color: '#C0C0C0', emoji: '🥈' },
  { name: 'ოქრო', min: 1500, max: 2999, color: '#FFD700', emoji: '🏅' },
  { name: 'პლატინა', min: 3000, max: Infinity, color: '#E5E4E2', emoji: '💎' },
];

const REWARDS = [
  { points: 200, label: '5% ფასდაკლება', icon: 'pricetag-outline' as const },
  { points: 500, label: '10% ფასდაკლება', icon: 'pricetag-outline' as const },
  { points: 1000, label: 'უფასო კოქტეილი', icon: 'wine-outline' as const },
  { points: 1500, label: 'VIP მაგიდა', icon: 'star-outline' as const },
];

export default function LoyaltyScreen() {
  const navigation = useNavigation();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [loyalty, setLoyalty] = useState<{ points: number; tier: string; nextTier: string | null; progress: number; referralCode: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    authApi.getLoyalty().then(r => setLoyalty(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [isAuthenticated]);

  const points = loyalty?.points ?? 0;
  const currentTier = TIERS.find(t => points >= t.min && points <= t.max) || TIERS[0];
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1];
  const progress = loyalty ? loyalty.progress / 100 : (nextTier ? (points - currentTier.min) / (nextTier.min - currentTier.min) : 1);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ლოიალობის პროგრამა</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Points card */}
        <View style={styles.pointsCard}>
          <View style={styles.tierBadge}>
            <Text style={styles.tierEmoji}>{currentTier.emoji}</Text>
            <Text style={[styles.tierName, { color: currentTier.color }]}>{currentTier.name}</Text>
          </View>
          <Text style={styles.pointsNum}>{points}</Text>
          <Text style={styles.pointsLabel}>ქულა</Text>

          {nextTier && (
            <View style={styles.progressWrap}>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: currentTier.color }]} />
              </View>
              <Text style={styles.progressText}>
                {nextTier.min - points} ქულა {nextTier.name}-ამდე {nextTier.emoji}
              </Text>
            </View>
          )}
        </View>

        {/* How to earn */}
        <Text style={styles.sectionTitle}>როგორ დავაგროვო</Text>
        <View style={styles.section}>
          {[
            { icon: 'calendar-outline' as const, label: 'ჯავშანი', pts: '+50 ქულა' },
            { icon: 'star-outline' as const, label: 'შეფასება', pts: '+20 ქულა' },
            { icon: 'people-outline' as const, label: 'მეგობრის მოწვევა', pts: '+500 ქულა' },
            { icon: 'heart-outline' as const, label: 'პირველი ჯავშანი', pts: '+100 ქულა' },
          ].map((item, i, arr) => (
            <View key={item.label} style={[styles.earnRow, i < arr.length - 1 && styles.rowBorder]}>
              <View style={styles.earnIcon}>
                <Ionicons name={item.icon} size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.earnLabel}>{item.label}</Text>
              <Text style={styles.earnPts}>{item.pts}</Text>
            </View>
          ))}
        </View>

        {/* Rewards */}
        <Text style={styles.sectionTitle}>ჯილდოები</Text>
        <View style={styles.rewardsGrid}>
          {REWARDS.map(r => {
            const unlocked = points >= r.points;
            return (
              <View key={r.points} style={[styles.rewardCard, !unlocked && styles.rewardLocked]}>
                <Ionicons name={r.icon} size={28} color={unlocked ? COLORS.primary : COLORS.textMuted} />
                <Text style={[styles.rewardLabel, !unlocked && styles.rewardLabelLocked]}>{r.label}</Text>
                <View style={[styles.rewardPtsBadge, !unlocked && styles.rewardPtsBadgeLocked]}>
                  <Text style={[styles.rewardPts, !unlocked && styles.rewardPtsLocked]}>{r.points} ქ.</Text>
                </View>
                {!unlocked && (
                  <Ionicons name="lock-closed" size={14} color={COLORS.textMuted} style={{ marginTop: 4 }} />
                )}
              </View>
            );
          })}
        </View>

        {/* Tiers */}
        <Text style={styles.sectionTitle}>სტატუსები</Text>
        <View style={styles.section}>
          {TIERS.map((t, i) => (
            <View key={t.name} style={[styles.tierRow, i < TIERS.length - 1 && styles.rowBorder, currentTier.name === t.name && styles.tierRowActive]}>
              <Text style={styles.tierEmoji2}>{t.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tierRowName, { color: t.color }]}>{t.name}</Text>
                <Text style={styles.tierRowRange}>
                  {t.max === Infinity ? `${t.min}+ ქულა` : `${t.min}–${t.max} ქულა`}
                </Text>
              </View>
              {currentTier.name === t.name && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>მიმდინარე</Text>
                </View>
              )}
            </View>
          ))}
        </View>

      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },

  pointsCard: { margin: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.primary + '44' },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  tierEmoji: { fontSize: 28 },
  tierName: { fontSize: 18, fontWeight: '800' },
  pointsNum: { fontSize: 64, fontWeight: '900', color: COLORS.text, lineHeight: 72 },
  pointsLabel: { fontSize: 16, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  progressWrap: { width: '100%', gap: SPACING.sm },
  progressBg: { height: 8, backgroundColor: COLORS.surfaceElevated, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  section: { marginHorizontal: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },

  earnRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  earnIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center' },
  earnLabel: { flex: 1, fontSize: 15, color: COLORS.text },
  earnPts: { fontSize: 14, fontWeight: '800', color: COLORS.primary },

  rewardsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md, gap: SPACING.sm },
  rewardCard: { flex: 1, minWidth: '45%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.primary + '44' },
  rewardLocked: { borderColor: COLORS.border, opacity: 0.7 },
  rewardLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  rewardLabelLocked: { color: COLORS.textMuted },
  rewardPtsBadge: { backgroundColor: COLORS.primary + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  rewardPtsBadgeLocked: { backgroundColor: COLORS.surfaceElevated },
  rewardPts: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  rewardPtsLocked: { color: COLORS.textMuted },

  tierRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: 14 },
  tierRowActive: { backgroundColor: COLORS.primary + '11' },
  tierEmoji2: { fontSize: 24 },
  tierRowName: { fontSize: 15, fontWeight: '800' },
  tierRowRange: { fontSize: 12, color: COLORS.textMuted },
  currentBadge: { backgroundColor: COLORS.primary + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  currentBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
});
