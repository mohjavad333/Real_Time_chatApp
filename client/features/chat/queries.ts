import { useQuery } from "@tanstack/react-query";
import { authClient, authedFetch } from "@/lib/auth";
import { toMessage, type Message } from "./chat-utils";
import type {
  ConversationListResponse,
  ConversationMediaResponse,
  ConversationMessagesResponse,
  CreateConversationResponse,
  SearchMessagesResponse,
  UserSearchResponse,
} from "@shared/api";

/** Query-key registry so socket handlers can write into the same caches. */
export const chatKeys = {
  conversations: ["chat", "conversations"] as const,
  messages: (conversationId: string | null) => ["chat", "messages", conversationId] as const,
  media: (conversationId: string | null) => ["chat", "media", conversationId] as const,
};

const MESSAGES_PAGE_SIZE = 30;

function authHeaders(): Record<string, string> {
  const session = authClient.getSession();
  if (!session) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${session.token}` };
}

export async function fetchConversations(archived = false): Promise<ConversationListResponse> {
  const response = await authedFetch(`/api/chat/conversations${archived ? "?archived=true" : ""}`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Unable to load conversations");
  return response.json();
}

export async function setConversationArchived(conversationId: string, archived: boolean): Promise<void> {
  const response = await authedFetch(`/api/chat/conversations/${conversationId}/archive`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ archived }),
  });
  if (!response.ok) throw new Error("Unable to update the conversation");
}

export async function fetchMessages(conversationId: string, page = 1): Promise<ConversationMessagesResponse> {
  const response = await authedFetch(`/api/chat/conversations/${conversationId}/messages?page=${page}&limit=${MESSAGES_PAGE_SIZE}`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Unable to load messages");
  return response.json();
}

export async function fetchConversationMedia(conversationId: string): Promise<ConversationMediaResponse> {
  const response = await authedFetch(`/api/chat/conversations/${conversationId}/media`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Unable to load shared media");
  return response.json();
}

export async function searchUsers(query: string): Promise<UserSearchResponse> {
  const response = await authedFetch(`/api/users/search?q=${encodeURIComponent(query)}`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Unable to search users");
  return response.json();
}

export async function searchConversationMessages(conversationId: string, query: string): Promise<SearchMessagesResponse> {
  const response = await authedFetch(`/api/chat/conversations/${conversationId}/messages/search?q=${encodeURIComponent(query)}`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Unable to search messages");
  return response.json();
}

export async function createConversation(memberId: string): Promise<CreateConversationResponse> {
  const response = await authedFetch("/api/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ memberId }),
  });
  if (!response.ok) throw new Error("Unable to start conversation");
  return response.json();
}

export async function uploadChatImage(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append("image", file);
  const response = await authedFetch("/api/media/images", { method: "POST", headers: authHeaders(), body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? "Image upload failed");
  return data;
}

export function toViewMessages(items: ConversationMessagesResponse["messages"], sessionUserId: string): Message[] {
  return items.map((item) => toMessage(item, sessionUserId));
}

export function useConversationsQuery(enabled: boolean, archived = false) {
  return useQuery({
    queryKey: [...chatKeys.conversations, { archived }],
    queryFn: () => fetchConversations(archived),
    enabled,
  });
}

export function useMessagesQuery(conversationId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: () => fetchMessages(conversationId!),
    enabled: enabled && Boolean(conversationId),
  });
}

export function useConversationMediaQuery(conversationId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: chatKeys.media(conversationId),
    queryFn: () => fetchConversationMedia(conversationId!),
    enabled: enabled && Boolean(conversationId),
  });
}

export function useUserSearchQuery(query: string) {
  return useQuery({
    queryKey: ["users", "search", query],
    queryFn: () => searchUsers(query),
    enabled: query.trim().length >= 2,
  });
}

export function useMessageSearchQuery(conversationId: string | null, query: string) {
  return useQuery({
    queryKey: ["messages", "search", conversationId, query],
    queryFn: () => searchConversationMessages(conversationId!, query),
    enabled: Boolean(conversationId) && query.trim().length >= 2,
  });
}
