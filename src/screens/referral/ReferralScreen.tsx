import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Share, Animated, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING, RADIUS } from '../../constants';
import { authApi } from '../../api/auth';

export default function ReferralScreen() {
  const navigation = useNavigation();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [code, setCode] = useState('...');
  const copyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isAuthenticated) return;
    authApi.getLoyalty().then(r => setCode(r.data.referralCode)).catch(() => {});
  }, [isAuthenticated]);

  const copyCode = () => {
    Clipboard.setString(code);
    Animated.sequence([
      Animated.timing(copyAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(copyAnim, { toValue: 0, duration: 150, delay: 1000, useNativeDriver: true }),
    ]).start();
  };

  const shareCode = async () => {
    await Share.share({
      message: `გამოიყენე ჩემი კოდი ${code} — SKUP Restaurants აპზე და მიიღე 500 ქულა! 🎁\nhttps://ge.skup.restaurants`,
      title: 'SKUP Restaurants — მოიწვიე მეგობარი',
    });
  };

  const scale = copyAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] });

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>მეგობრის მოწვევა</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🎁</Text>
          <Text style={styles.heroTitle}>მოიწვიე მეგობარი</Text>
          <Text style={styles.heroSub}>
            გაუზიარე კოდი — ორივე მიიღებთ{'\n'}
            <Text style={{ color: COLORS.primary, fontWeight: '900' }}>500 ლოიალობის ქულას</Text>
          </Text>
        </View>

        {/* Code card */}
        <Animated.View style={[styles.codeCard, { transform: [{ scale }] }]}>
          <Text style={styles.codeLabel}>შენი კოდი</Text>
          <Text style={styles.code}>{code}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={copyCode}>
            <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
            <Text style={styles.copyBtnText}>კოდის კოპირება</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Steps */}
        <View style={styles.stepsCard}>
          {[
            { step: '1', text: 'გაუზიარე კოდი მეგობარს' },
            { step: '2', text: 'მეგობარი დარეგისტრირდება' },
            { step: '3', text: 'ორივე მიიღებს 500 ქულას' },
          ].map((s, i, arr) => (
            <View key={s.step} style={[styles.step, i < arr.length - 1 && styles.stepBorder]}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{s.step}</Text>
              </View>
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
          ))}
        </View>

        {/* Share button */}
        <TouchableOpacity style={styles.shareBtn} onPress={shareCode} activeOpacity={0.85}>
          <Ionicons name="share-social-outline" size={20} color="#fff" />
          <Text style={styles.shareBtnText}>კოდის გაზიარება</Text>
        </TouchableOpacity>

        <Text style={styles.note}>* ქულები დაგერიცხება მეგობრის პირველი ჯავშნის შემდეგ</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },

  content: { flex: 1, padding: SPACING.lg, alignItems: 'center' },

  hero: { alignItems: 'center', marginBottom: SPACING.xl },
  heroEmoji: { fontSize: 72, marginBottom: SPACING.md },
  heroTitle: { fontSize: 26, fontWeight: '900', color: COLORS.text, marginBottom: SPACING.sm },
  heroSub: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },

  codeCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary + '44', marginBottom: SPACING.lg },
  codeLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700', marginBottom: SPACING.sm },
  code: { fontSize: 38, fontWeight: '900', color: COLORS.primary, letterSpacing: 8, marginBottom: SPACING.md },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary + '18', paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full },
  copyBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },

  stepsCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.xl },
  step: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md },
  stepBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  stepNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 15, fontWeight: '900', color: '#fff' },
  stepText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },

  shareBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, height: 56, marginBottom: SPACING.md },
  shareBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },

  note: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
});
