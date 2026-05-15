import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  FlatList, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../types';
import { COLORS, SPACING, RADIUS } from '../../constants';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'restaurant' as const,
    emoji: '🍽️',
    title: 'იპოვე შენი\nსასადილო ადგილი',
    subtitle: '500+ რესტორანი თბილისში — ერთ აპლიკაციაში',
    color: COLORS.primary,
  },
  {
    icon: 'calendar' as const,
    emoji: '📅',
    title: 'ჯავშნა\nწამებში',
    subtitle: 'დაჯავშნე მაგიდა ნებისმიერ დროს, ნებისმიერი რესტორნიდან',
    color: '#F59E0B',
  },
  {
    icon: 'heart' as const,
    emoji: '❤️',
    title: 'შეინახე\nფავორიტები',
    subtitle: 'შექმენი შენი ფავორიტი რესტორნების სია და დაუბრუნდი ნებისმიერ დროს',
    color: '#EF4444',
  },
  {
    icon: 'location' as const,
    emoji: '📍',
    title: 'ახლომახლო\nრესტორნები',
    subtitle: 'გაგვიზიარე მდებარეობა — ვიპოვებთ შენთან ახლოს საუკეთესოებს',
    color: '#8B5CF6',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const finish = async () => {
    await Location.requestForegroundPermissionsAsync().catch(() => {});
    await AsyncStorage.setItem('onboarding_done', 'true');
    navigation.replace('Main');
  };

  const next = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      finish();
    }
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.root}>

      {/* Skip */}
      <TouchableOpacity style={styles.skip} onPress={finish}>
        <Text style={styles.skipText}>გამოტოვება</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef as any}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.iconWrap, { backgroundColor: item.color + '22', borderColor: item.color + '44' }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width: dotWidth, opacity, backgroundColor: COLORS.primary }]}
            />
          );
        })}
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.ctaBtn} onPress={next} activeOpacity={0.85}>
          <Text style={styles.ctaText}>
            {isLast ? 'დაწყება' : 'შემდეგი'}
          </Text>
          <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={20} color="#fff" />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  skip: { alignSelf: 'flex-end', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  skipText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },

  slide: { width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl, paddingBottom: 60 },
  iconWrap: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xl, borderWidth: 2 },
  emoji: { fontSize: 80 },
  title: { fontSize: 32, fontWeight: '900', color: COLORS.text, textAlign: 'center', lineHeight: 40, marginBottom: SPACING.lg },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 26 },

  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: SPACING.xl },
  dot: { height: 8, borderRadius: 4 },

  footer: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, height: 58 },
  ctaText: { fontSize: 18, fontWeight: '800', color: '#fff' },
});
