import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS } from '../../constants';
import { managerApi } from '../../api/restaurants';
import { RestaurantPhoto, RootStackParamList } from '../../types';

type Route = RouteProp<RootStackParamList, 'ManagerPhotos'>;

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - SPACING.md * 2 - SPACING.sm * 2) / 3;

export default function ManagerPhotosScreen() {
  const nav = useNavigation();
  const { params } = useRoute<Route>();
  const rid = params.restaurantId;

  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<RestaurantPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      const res = await managerApi.getMyRestaurant();
      setPhotos((res.data.photos || []).sort((a, b) => a.sortOrder - b.sortOrder));
    } catch {
      Alert.alert('შეცდომა', 'ფოტოები ვერ ჩაიტვირთა');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pickAndUpload = async (isCover = false) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('', 'გალერეაზე წვდომა საჭიროა'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: !isCover,
    });

    if (result.canceled) return;
    setUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const assets = result.assets;
      for (let i = 0; i < assets.length; i++) {
        const isFirst = i === 0 && isCover;
        await managerApi.uploadPhoto(rid, assets[i].uri, isFirst);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      load();
    } catch {
      Alert.alert('შეცდომა', 'ატვირთვა ვერ მოხერხდა');
    } finally {
      setUploading(false);
    }
  };

  const handleSetCover = (photoId: string) => {
    Alert.alert('', 'ამ ფოტოს გავხდეთ მთავარი?', [
      { text: 'არა', style: 'cancel' },
      {
        text: 'დიახ', onPress: async () => {
          try {
            await managerApi.setCoverPhoto(rid, photoId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            load();
          } catch { Alert.alert('შეცდომა', 'ვერ შეიცვალა'); }
        },
      },
    ]);
  };

  const handleDelete = (photoId: string) => {
    Alert.alert('ფოტოს წაშლა', 'ეს ფოტო სამუდამოდ წაიშლება.', [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: 'წაშლა', style: 'destructive', onPress: async () => {
          try {
            await managerApi.deletePhoto(rid, photoId);
            setPhotos(prev => prev.filter(p => p.id !== photoId));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch { Alert.alert('შეცდომა', 'წაშლა ვერ მოხერხდა'); }
        },
      },
    ]);
  };

  if (loading) {
    return <SafeAreaView style={styles.root}><View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>ფოტოგალერეა</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Upload buttons */}
        <View style={styles.uploadRow}>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => pickAndUpload(false)} disabled={uploading}>
            <Ionicons name="images-outline" size={20} color={COLORS.primary} />
            <Text style={styles.uploadText}>ფოტოების დამატება</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.uploadBtn, styles.uploadCoverBtn]} onPress={() => pickAndUpload(true)} disabled={uploading}>
            <Ionicons name="star-outline" size={20} color="#fff" />
            <Text style={[styles.uploadText, { color: '#fff' }]}>მთავარი ფოტო</Text>
          </TouchableOpacity>
        </View>

        {uploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.uploadingText}>იტვირთება...</Text>
          </View>
        )}

        {photos.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="images-outline" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>ფოტოები არ არის</Text>
            <Text style={styles.emptySub}>დაამატეთ გალერეის ფოტოები</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {photos.map(photo => (
              <View key={photo.id} style={styles.photoWrap}>
                <Image source={{ uri: photo.url }} style={styles.photo} contentFit="cover" />
                {photo.isCover && (
                  <View style={styles.coverBadge}>
                    <Ionicons name="star" size={10} color="#fff" />
                    <Text style={styles.coverText}>მთავარი</Text>
                  </View>
                )}
                <View style={styles.photoActions}>
                  {!photo.isCover && (
                    <TouchableOpacity style={styles.photoActionBtn} onPress={() => handleSetCover(photo.id)}>
                      <Ionicons name="star-outline" size={15} color="#fff" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.photoActionBtn, styles.deleteActionBtn]} onPress={() => handleDelete(photo.id)}>
                    <Ionicons name="trash-outline" size={15} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  content: { padding: SPACING.md, gap: SPACING.md },
  uploadRow: { flexDirection: 'row', gap: SPACING.sm },
  uploadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.primary + '12' },
  uploadCoverBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  uploadText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  uploadingBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.md },
  uploadingText: { fontSize: 13, color: COLORS.textSecondary },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  photoWrap: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: RADIUS.md, overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  coverBadge: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 3 },
  coverText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  photoActions: { position: 'absolute', bottom: 6, right: 6, flexDirection: 'row', gap: 5 },
  photoActionBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  deleteActionBtn: { backgroundColor: 'rgba(220,38,38,0.8)' },
});
