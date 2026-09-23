export interface DemoResponse {
  message: string;
}

export interface HealthResponse {
  status: "ok";
  service: string;
}

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  online?: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  readBy: string[];
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  members: ChatUser[];
  lastMessage?: ChatMessage;
  updatedAt: string;
}

export interface AuthResponse {
  user: ChatUser;
  token: string;
}

/** Raw shapes returned by the current REST API (populated Mongo documents). */

export type ConversationMemberDto = {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  lastSeenAt?: string;
};

export type MessageDto = {
  _id: string;
  conversationId: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  readBy: string[];
  createdAt: string;
  updatedAt: string;
};

export type ConversationDto = {
  _id: string;
  memberIds: ConversationMemberDto[];
  lastMessageId?: MessageDto;
  updatedAt: string;
  unreadCount?: number;
  archivedFor?: string[];
};

export type ConversationListResponse = {
  conversations: ConversationDto[];
};

export type ConversationMessagesResponse = {
  messages: MessageDto[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

export type CreateConversationResponse = {
  conversation: ConversationDto;
};

export type CreateMessageResponse = {
  message: MessageDto;
};

export type SearchMessagesResponse = {
  messages: MessageDto[];
};

export type ConversationMediaResponse = {
  media: { _id: string; imageUrl: string; createdAt: string }[];
};

export type UserSearchResponse = {
  users: { _id: string; name: string; email: string; avatarUrl?: string }[];
};

/** Socket payloads shared by client and server. */

export type PresenceSnapshotPayload = {
  onlineUserIds: string[];
};

export type PresenceChangedPayload = {
  userId: string;
  online: boolean;
};

export type ChatMessagePayload = {
  conversationId: string;
  _id: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  readBy: string[];
  createdAt: string;
};

export type ChatTypingPayload = {
  conversationId: string;
  userId: string;
  isTyping: boolean;
};

export type ChatReadPayload = {
  conversationId: string;
  userId: string;
};
