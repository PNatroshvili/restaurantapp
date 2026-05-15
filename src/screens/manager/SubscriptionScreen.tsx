import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS } from '../../constants';

const PRICE = 49; // GEL per month
const CURRENCY = '₾';

// Mock subscription state — replace with real API call
const MOCK_SUB = {
  status: 'active' as 'active' | 'expired' | 'trial',
  expiresAt: '2026-06-10',
  daysLeft: 31,
};

const FEATURES = [
  'ჯავშნების მართვა',
  'მენეჯერის პანელი',
  'სტატისტიკა და ანალიტიკა',
  'მობილური შეტყობინებები',
  'პლატფორმაზე განთავსება',
  'SKUP-ის მხარდაჭერა',
];

export default function SubscriptionScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const sub = MOCK_SUB;

  const statusColor = sub.status === 'active' ? COLORS.success : sub.status === 'trial' ? COLORS.warning : COLORS.error;
  const statusLabel = sub.status === 'active' ? 'აქტიური' : sub.status === 'trial' ? 'საცდელი' : 'ვადაგასული';
  const statusIcon = sub.status === 'active' ? 'checkmark-circle' : sub.status === 'trial' ? 'time' : 'close-circle';

  const handlePay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'გამოწერის განახლება',
      `ყოველთვიური გადასახადი: ${PRICE}${CURRENCY}\n\nგადახდის გასაგრძელებლად დაუკავშირდით SKUP-ის გუნდს.`,
      [
        { text: 'გაუქმება', style: 'cancel' },
        {
          text: 'დაკავშირება',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('', 'მალე დაგიკავშირდებით!');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>გამოწერა</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Current status card */}
        <View style={[styles.statusCard, { borderColor: statusColor + '55' }]}>
          <View style={[styles.statusIconWrap, { backgroundColor: statusColor + '18' }]}>
            <Ionicons name={statusIcon as any} size={32} color={statusColor} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>სტატუსი</Text>
            <Text style={[styles.statusValue, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>ვადა</Text>
            <Text style={styles.statusDate}>{sub.expiresAt}</Text>
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>დარჩა</Text>
            <Text style={styles.statusDays}>{sub.daysLeft} დღე</Text>
          </View>
        </View>

        {/* Pricing card */}
        <View style={styles.priceCard}>
          <View style={styles.priceHeader}>
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>ყველაზე პოპულარული</Text>
            </View>
          </View>
          <Text style={styles.planName}>სტანდარტული გეგმა</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{PRICE}</Text>
            <Text style={styles.currency}>{CURRENCY}</Text>
            <Text style={styles.period}>/თვე</Text>
          </View>
          <Text style={styles.priceNote}>დღგ-ს ჩათვლით</Text>

          <View style={styles.divider} />

          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureCheck}>
                <Ionicons name="checkmark" size={14} color={COLORS.primary} />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Pay button */}
        <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.85}>
          <Ionicons name="card-outline" size={20} color="#fff" />
          <Text style={styles.payBtnText}>
            {sub.status === 'expired' ? 'განახლება' : 'გადახდა'}
          </Text>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.textMuted} />
          <Text style={styles.infoText}>
            გამოწერა ავტომატურად განახლდება ყოველი თვე. გაუქმება შესაძლებელია ნებისმიერ დროს support@skup.ge-ზე.
          </Text>
        </View>

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

  statusCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  statusIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  statusInfo: { flex: 1, alignItems: 'center' },
  statusLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  statusDate: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  statusDays: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginTop: 2 },

  priceCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.primary + '44', padding: SPACING.lg, gap: SPACING.sm },
  priceHeader: { alignItems: 'flex-start' },
  priceBadge: { backgroundColor: COLORS.primary + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  priceBadgeText: { fontSize: 11, color: COLORS.primary, fontWeight: '800' },
  planName: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  price: { fontSize: 42, fontWeight: '900', color: COLORS.text, lineHeight: 50 },
  currency: { fontSize: 22, fontWeight: '800', color: COLORS.primary, marginBottom: 6 },
  period: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  priceNote: { fontSize: 11, color: COLORS.textMuted },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  featureCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },

  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 16 },
  payBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  infoCard: { flexDirection: 'row', gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  infoText: { flex: 1, fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
});
