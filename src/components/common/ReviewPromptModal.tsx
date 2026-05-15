import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS } from '../../constants';

interface Props {
  visible: boolean;
  restaurantName: string;
  onSubmit: (rating: number, comment: string) => void;
  onDismiss: () => void;
}

export default function ReviewPromptModal({ visible, restaurantName, onSubmit, onDismiss }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleStar = (n: number) => {
    setRating(n);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = () => {
    if (rating === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(rating, comment);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
            <Ionicons name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <Ionicons name="star" size={40} color={COLORS.primary} style={{ alignSelf: 'center' }} />
          <Text style={styles.title}>შეაფასეთ ვიზიტი</Text>
          <Text style={styles.sub}>{restaurantName}</Text>

          {/* Stars */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => handleStar(n)} activeOpacity={0.7}>
                <Ionicons
                  name={n <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={n <= rating ? '#FFB800' : COLORS.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <Text style={styles.ratingLabel}>
              {rating === 5 ? 'შესანიშნავი!' : rating === 4 ? 'ძალიან კარგი' : rating === 3 ? 'კარგი' : rating === 2 ? 'საშუალო' : 'ცუდი'}
            </Text>
          )}

          <TextInput
            style={styles.input}
            placeholder="დაწერეთ კომენტარი (არასავალდებულო)"
            placeholderTextColor={COLORS.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            maxLength={300}
          />

          <TouchableOpacity
            style={[styles.submitBtn, rating === 0 && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={rating === 0}
            activeOpacity={0.8}
          >
            <Ionicons name="send-outline" size={16} color="#fff" />
            <Text style={styles.submitText}>შეფასების გაგზავნა</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onDismiss} style={styles.laterBtn}>
            <Text style={styles.laterText}>მოგვიანებით</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, gap: SPACING.md, paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: SPACING.sm },
  closeBtn: { position: 'absolute', top: SPACING.md, right: SPACING.md, padding: 4 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  sub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: -SPACING.sm },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm },
  ratingLabel: { fontSize: 13, fontWeight: '700', color: COLORS.primary, textAlign: 'center', marginTop: -SPACING.sm },
  input: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: 14, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 14 },
  submitDisabled: { opacity: 0.4 },
  submitText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  laterBtn: { alignItems: 'center', paddingVertical: 4 },
  laterText: { fontSize: 13, color: COLORS.textMuted },
});
