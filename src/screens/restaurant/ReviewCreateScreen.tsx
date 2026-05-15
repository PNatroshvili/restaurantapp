import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { COLORS, SPACING, RADIUS } from '../../constants';
import { reviewsApi } from '../../api/reviews';
import StarRating from '../../components/common/StarRating';
import Button from '../../components/common/Button';

type RouteProps = RouteProp<RootStackParamList, 'ReviewCreate'>;

export default function ReviewCreateScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { restaurantId } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (rating === 0) { Alert.alert('', 'გთხოვთ აირჩიოთ შეფასება'); return; }
    setLoading(true);
    try {
      await reviewsApi.create({ restaurant_id: restaurantId, rating, comment });
      Alert.alert('გმადლობთ!', 'შეფასება წარმატებით დაემატა', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('შეცდომა', e?.response?.data?.message || 'ვერ დაემატა');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.handle} />
      <Text style={styles.title}>შეფასების დამატება</Text>
      <Text style={styles.label}>ვარსკვლავები</Text>
      <StarRating rating={rating} size={36} interactive onRate={setRating} />
      <Text style={styles.label}>კომენტარი (არასავალდებულო)</Text>
      <TextInput
        style={styles.textarea}
        placeholder="გაგვიზიარეთ შთაბეჭდილება..."
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        placeholderTextColor={COLORS.textMuted}
      />
      <Button label="გამოქვეყნება" onPress={submit} loading={loading} style={styles.btn} />
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancel}>
        <Text style={styles.cancelText}>გაუქმება</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg, paddingTop: SPACING.md },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.lg },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.sm },
  textarea: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, fontSize: 14, color: COLORS.text, height: 120, backgroundColor: COLORS.surface },
  btn: { marginTop: SPACING.lg },
  cancel: { alignItems: 'center', marginTop: SPACING.md },
  cancelText: { color: COLORS.textSecondary, fontSize: 14 },
});
