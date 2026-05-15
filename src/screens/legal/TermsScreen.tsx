import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../../constants';

const SECTIONS = [
  {
    title: 'სერვისის გამოყენება',
    body: 'SKUP Restaurants-ის სერვისი განკუთვნილია 18 წელს გადაცილებული პირებისთვის. სერვისის გამოყენებით თქვენ ეთანხმებით ამ პირობებს.',
  },
  {
    title: 'ანგარიში და უსაფრთხოება',
    body: 'თქვენ პასუხისმგებელი ხართ ანგარიშის კონფიდენციალობაზე. მოტყუებული ან ყალბი ინფორმაციის მიწოდება გამოიწვევს ანგარიშის გაუქმებას.',
  },
  {
    title: 'ჯავშნები',
    body: 'ჯავშნის გაუქმება შესაძლებელია ვიზიტამდე სულ მცირე 2 საათით ადრე. გაუქმების გარეშე 3-ჯერ გამოუცხადებლობა შეიძლება გამოიწვიოს ანგარიშის შეზღუდვა.',
  },
  {
    title: 'სერვისის ხელმისაწვდომობა',
    body: 'ჩვენ ვცდილობთ უზრუნველვყოთ სერვისის შეუფერხებელი მუშაობა, თუმცა ვერ ვიძლევით 100%-იანი ხელმისაწვდომობის გარანტიას. ტექნიკური სამუშაოების დროს სერვისი შეიძლება დროებით მიუწვდომელი იყოს.',
  },
  {
    title: 'ინტელექტუალური საკუთრება',
    body: 'SKUP Restaurants-ის ლოგო, დიზაინი და კონტენტი დაცულია საავტორო უფლებებით. მისი გამოყენება ნებართვის გარეშე აკრძალულია.',
  },
  {
    title: 'პასუხისმგებლობა',
    body: 'SKUP Restaurants წარმოადგენს შუამავალ პლატფორმას. ჩვენ პასუხს არ ვაგებთ რესტორნის სერვისის ხარისხზე, საკვების ხარისხზე ან ნებისმიერ ზიანზე, რომელიც შეიძლება მოგადგეთ.',
  },
  {
    title: 'ცვლილებები',
    body: 'ჩვენ ვიტოვებთ უფლებას შევცვალოთ ეს პირობები ნებისმიერ დროს. მნიშვნელოვანი ცვლილებების შემთხვევაში მომხმარებლებს ეცნობებათ.',
  },
];

export default function TermsScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>გამოყენების პირობები</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          გთხოვთ, ყურადღებით წაიკითხოთ SKUP Restaurants-ის გამოყენების პირობები. სერვისის გამოყენებით თქვენ ეთანხმებით ქვემოთ მოცემულ პირობებს.
        </Text>
        <Text style={styles.updated}>ბოლო განახლება: მაისი 2026</Text>
        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNum}>
                <Text style={styles.sectionNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.sectionTitle}>{s.title}</Text>
            </View>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
        <Text style={styles.contact}>კითხვებისთვის: legal@skup.ge</Text>
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sectionNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center' },
  sectionNumText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, flex: 1 },
  sectionBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 21 },
  contact: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontStyle: 'italic' },
});
