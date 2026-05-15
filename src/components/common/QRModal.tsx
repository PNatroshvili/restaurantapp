import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS } from '../../constants';

interface Props {
  visible: boolean;
  bookingId: string;
  restaurantName: string;
  date: string;
  time: string;
  guests: number;
  onClose: () => void;
}

export default function QRModal({ visible, bookingId, restaurantName, date, time, guests, onClose }: Props) {
  const qrValue = JSON.stringify({ bookingId, restaurantName, date, time, guests });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Check-in QR კოდი</Text>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sub}>აჩვენეთ ეს QR კოდი რესტორანში შესვლისას</Text>

          <View style={styles.qrWrap}>
            <QRCode
              value={qrValue}
              size={220}
              color="#000"
              backgroundColor="#fff"
              logo={undefined}
            />
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="restaurant-outline" size={15} color={COLORS.primary} />
              <Text style={styles.infoText} numberOfLines={1}>{restaurantName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={15} color={COLORS.primary} />
              <Text style={styles.infoText}>{date} · {time}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={15} color={COLORS.primary} />
              <Text style={styles.infoText}>{guests} სტუმარი</Text>
            </View>
          </View>

          <View style={styles.idRow}>
            <Text style={styles.idLabel}>ჯავშნის ID</Text>
            <Text style={styles.idValue}>#{bookingId.slice(0, 8).toUpperCase()}</Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>დახურვა</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, paddingBottom: 40, alignItems: 'center', gap: SPACING.md },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  qrWrap: { backgroundColor: '#fff', padding: 20, borderRadius: RADIUS.xl, marginVertical: SPACING.sm },
  infoCard: { width: '100%', backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  infoText: { fontSize: 14, color: COLORS.text, fontWeight: '600', flex: 1 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  idLabel: { fontSize: 12, color: COLORS.textMuted },
  idValue: { fontSize: 13, fontWeight: '800', color: COLORS.primary, fontFamily: 'monospace' },
  closeBtn: { width: '100%', height: 50, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
