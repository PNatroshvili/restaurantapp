import { apiClient } from './client';

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderRole: string;
  content: string;
  createdAt: string;
}

export const chatApi = {
  getMessages: (bookingId: string) =>
    apiClient.get<ChatMessage[]>(`/chat/${bookingId}`),
};
