import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { COLORS, SPACING, RADIUS } from '../../constants';
import { reviewsApi } from '../../api/reviews';
import { showToast } from '../../components/common/Toast';
import StarRating from '../../components/common/StarRating';
import Button from '../../components/common/Button';

type RouteProps = RouteProp<RootStackParamList, 'ReviewCreate'>;

const MAX_PHOTOS = 3;

export default function ReviewCreateScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { restaurantId } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('', 'სურათების წვდომა გჭირდებათ');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });

    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setPhotos(prev => [...prev, ...uris].slice(0, MAX_PHOTOS));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const removePhoto = (uri: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhotos(prev => prev.filter(p => p !== uri));
  };

  const submit = async () => {
    if (rating === 0) { Alert.alert('', 'გთხოვთ აირჩიოთ შეფასება'); return; }
    setLoading(true);
    try {
      await reviewsApi.create({ restaurant_id: restaurantId, rating, comment, photos });
      showToast('შეფასება წარმატებით დაემატა ⭐');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('შეცდომა', e?.response?.data?.message || 'ვერ დაემატა');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.handle} />
          <Text style={styles.title}>შეფასების დამატება</Text>

          {/* Star rating */}
          <Text style={styles.label}>ვარსკვლავები</Text>
          <StarRating rating={rating} size={36} interactive onRate={r => { setRating(r); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />

          {/* Comment */}
          <Text style={styles.label}>კომენტარი (არასავალდებულო)</Text>
          <TextInput
            style={styles.textarea}
            placeholder="გაგვიზიარეთ შთაბეჭდილება..."
            value={comment}
            onChangeText={v => setComment(v.slice(0, 300))}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor={COLORS.textMuted}
            maxLength={300}
          />
          <Text style={styles.charCounter}>{comment.length}/300</Text>

          {/* Photo section */}
          <Text style={styles.label}>ფოტოები (არასავალდებულო, მაქსიმუმ {MAX_PHOTOS})</Text>
          <View style={styles.photoRow}>
            {photos.map(uri => (
              <View key={uri} style={styles.photoThumb}>
                <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(uri)}>
                  <Ionicons name="close-circle" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickPhoto} activeOpacity={0.75}>
                <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
                <Text style={styles.addPhotoText}>ფოტო</Text>
              </TouchableOpacity>
            )}
          </View>

          <Button label="გამოქვეყნება" onPress={submit} loading={loading} style={styles.btn} />
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancel}>
            <Text style={styles.cancelText}>გაუქმება</Text>
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.lg },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.sm },
  textarea: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, fontSize: 14, color: COLORS.text, height: 120, backgroundColor: COLORS.surface },
  charCounter: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginTop: 4, fontWeight: '600' },

  photoRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  photoThumb: { width: 88, height: 88, borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: COLORS.surfaceElevated },
  removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12 },
  addPhotoBtn: {
    width: 88, height: 88, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: COLORS.surface,
  },
  addPhotoText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },

  btn: { marginTop: SPACING.lg },
  cancel: { alignItems: 'center', marginTop: SPACING.md },
  cancelText: { color: COLORS.textSecondary, fontSize: 14 },
});
