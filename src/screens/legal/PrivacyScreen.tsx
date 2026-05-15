import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../../constants';

const SECTIONS = [
  {
    title: 'მონაცემთა შეგროვება',
    body: 'ჩვენ ვაგროვებთ მხოლოდ იმ ინფორმაციას, რომელიც საჭიროა სერვისის გასაწევად: სახელი, ტელეფონის ნომერი ან ელ-ფოსტა, ჯავშნის ინფორმაცია და მდებარეობა (მხოლოდ თქვენი ნებართვით).',
  },
  {
    title: 'მონაცემთა გამოყენება',
    body: 'თქვენი მონაცემები გამოიყენება ჯავშნების მართვისთვის, შეტყობინებების გაგზავნისთვის და სერვისის გასაუმჯობესებლად. ჩვენ არ ვყიდით თქვენს მონაცემებს მესამე მხარეებს.',
  },
  {
    title: 'მდებარეობა',
    body: 'მდებარეობის ინფორმაცია გამოიყენება ახლომდებარე რესტორნების საჩვენებლად. ამ ფუნქციის გამოსაყენებლად საჭიროა თქვენი ნებართვა.',
  },
  {
    title: 'შეტყობინებები',
    body: 'ჯავშნის დადასტურების და შეხსენების შეტყობინებები იგზავნება მხოლოდ თქვენი ნებართვით. ნებისმიერ დროს შეგიძლიათ გამორთოთ პარამეტრებიდან.',
  },
  {
    title: 'მონაცემთა დაცვა',
    body: 'თქვენი მონაცემები დაცულია SSL დაშიფვრით. პაროლები ინახება დაშიფრული სახით და ვერ იქნება წაკითხული ჩვენი გუნდის მიერ.',
  },
  {
    title: 'კონტაქტი',
    body: 'კონფიდენციალობასთან დაკავშირებული კითხვებისთვის მოგვწერეთ: privacy@skup.ge',
  },
];

export default function PrivacyScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>კონფიდენციალობის პოლიტიკა</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          SKUP Restaurants გთავაზობთ სარესტორნო ჯავშნების სერვისს. ეს პოლიტიკა განმარტავს, თუ როგორ ვიყენებთ თქვენს მონაცემებს.
        </Text>
        <Text style={styles.updated}>ბოლო განახლება: მაისი 2026</Text>
        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
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
  intro: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  updated: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  section: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  sectionBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 21 },
});
