import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/authStore';
import { chatApi, ChatMessage } from '../../api/chat';
import { COLORS, SPACING, RADIUS } from '../../constants';
import { RootStackParamList } from '../../types';

type RouteProps = RouteProp<RootStackParamList, 'Chat'>;

const SOCKET_URL = 'https://api.skup.ge';

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { bookingId, restaurantName } = route.params as any;
  const user = useAuthStore(s => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    chatApi.getMessages(bookingId)
      .then(r => setMessages(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    const socket = io(`${SOCKET_URL}/chat`, { path: '/socket.io', transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('joinBookingRoom', bookingId);
    socket.on('newMessage', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => { socket.disconnect(); };
  }, [bookingId]);

  const send = () => {
    const content = text.trim();
    if (!content || !socketRef.current || !user) return;
    socketRef.current.emit('sendMessage', {
      bookingId,
      senderId: user.id,
      senderRole: user.role,
      content,
    });
    setText('');
  };

  const isMe = (msg: ChatMessage) => msg.senderId === user?.id;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{restaurantName}</Text>
          <Text style={styles.headerSub}>ჯავშნის ჩატი</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm, paddingBottom: 8 }}
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>შეტყობინება არ არის</Text>
                <Text style={styles.emptySub}>დაიწყეთ საუბარი რესტორანთან</Text>
              </View>
            }
            renderItem={({ item: msg }) => {
              const me = isMe(msg);
              return (
                <View style={[styles.msgRow, me && styles.msgRowMe]}>
                  <View style={[styles.bubble, me ? styles.bubbleMe : styles.bubbleThem]}>
                    {!me && (
                      <Text style={styles.senderLabel}>
                        {msg.senderRole === 'restaurant_manager' ? 'რესტორანი' : 'მომხმარებელი'}
                      </Text>
                    )}
                    <Text style={[styles.msgText, me && styles.msgTextMe]}>{msg.content}</Text>
                    <Text style={[styles.msgTime, me && styles.msgTimeMe]}>
                      {new Date(msg.createdAt).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="შეტყობინება..."
            placeholderTextColor={COLORS.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            onSubmitEditing={send}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!text.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.textSecondary },

  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: SPACING.md },
  emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textSecondary },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end' },
  msgRowMe: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: RADIUS.lg, padding: SPACING.sm, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  bubbleMe: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  bubbleThem: {},
  senderLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', marginBottom: 2 },
  msgText: { fontSize: 15, color: COLORS.text, lineHeight: 20 },
  msgTextMe: { color: '#fff' },
  msgTime: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  msgTimeMe: { color: 'rgba(255,255,255,0.7)' },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, padding: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.background },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
