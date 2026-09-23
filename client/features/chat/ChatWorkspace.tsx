import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { authClient } from "@/lib/auth";
import { connectChatSocket, disconnectChatSocket } from "@/lib/socket";
import { OPEN_CONVERSATION_EVENT, isConversationMuted, isMuted, setConversationMuted, showMessageNotification } from "@/lib/notifications";
import { Sidebar } from "./Sidebar";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { DetailsPanel } from "./DetailsPanel";
import { ImageLightbox } from "./ImageLightbox";
import { chatKeys, createConversation, fetchMessages, sendMessageRest, setConversationArchived, toViewMessages, uploadChatImage, useConversationMediaQuery, useConversationsQuery, useMessageSearchQuery, useMessagesQuery, useUserSearchQuery } from "./queries";
import {
  avatarColorCycle,
  formatTime,
  initialsFor,
  toChat,
  toMessage,
  type Chat,
  type Message,
  type SharedMedia,
} from "./chat-utils";
import type {
  ChatMessagePayload,
  ChatReadPayload,
  ChatTypingPayload,
  PresenceChangedPayload,
  PresenceSnapshotPayload,
} from "@shared/api";

const TYPING_REANNOUNCE_MS = 2000;
const TYPING_STOP_DELAY_MS = 3000;
const TYPING_EXPIRY_MS = 4000;
const BASE_TITLE = document.title;

export default function ChatWorkspace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sessionUser] = useState(() => authClient.getUser());
  const hasSession = Boolean(authClient.getSession());

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState<Record<string, { page: number; pages: number }>>({});
  const [mediaByConversation, setMediaByConversation] = useState<Record<string, SharedMedia[]>>({});
  const [typingByConversation, setTypingByConversation] = useState<Record<string, string[]>>({});
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [socketConnected, setSocketConnected] = useState(false);

  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [attachment, setAttachment] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [lightboxImage, setLightboxImage] = useState("");
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [debouncedUserQuery, setDebouncedUserQuery] = useState("");
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageQuery, setMessageQuery] = useState("");
  const [debouncedMessageQuery, setDebouncedMessageQuery] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);

  const typingExpiryTimers = useRef<Record<string, number>>({});
  const lastTypingSentAt = useRef(0);
  const stopTypingTimer = useRef<number | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollMetricsRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null);
  const prevMessageCountRef = useRef<Record<string, number>>({});

  // ---- React Query data ----
  const conversationsQuery = useConversationsQuery(hasSession, showArchived);
  const userSearchQuery = useUserSearchQuery(debouncedUserQuery);

  const chats: Chat[] = useMemo(
    () => (conversationsQuery.data?.conversations ?? []).map((conversation, index) => toChat(conversation, sessionUser?.id ?? "", index)),
    [conversationsQuery.data, sessionUser?.id],
  );
  const visibleChats = useMemo(
    () => chats.filter((chat) => `${chat.name} ${chat.message}`.toLowerCase().includes(query.toLowerCase())),
    [chats, query],
  );
  const selectedChat = useMemo(() => chats.find((chat) => chat.id === selectedId) ?? null, [chats, selectedId]);
  const activeConversationId = selectedChat?.id ?? null;
  activeConversationIdRef.current = activeConversationId;
  const messagesQuery = useMessagesQuery(activeConversationId, hasSession);
  const mediaQuery = useConversationMediaQuery(activeConversationId, hasSession);
  const messageSearchQuery = useMessageSearchQuery(activeConversationId, debouncedMessageQuery);
  const typingNames = (typingByConversation[activeConversationId ?? ""] ?? []).map(() => selectedChat?.name ?? "Someone");
  const chatIsOnline = (chat: Chat) => chat.memberIds.some((id) => id !== sessionUser?.id && onlineUserIds.has(id));
  const selectedChatIsOnline = selectedChat ? chatIsOnline(selectedChat) : false;
  const activePagination = activeConversationId ? pagination[activeConversationId] : undefined;
  const hasMoreMessages = activePagination ? activePagination.page < activePagination.pages : false;

  const logout = () => {
    disconnectChatSocket();
    authClient.logout();
    navigate("/auth");
  };

  const toggleArchiveConversation = async () => {
    const conversationId = selectedChat?.id;
    if (!conversationId) return;
    try {
      await setConversationArchived(conversationId, !selectedChat.archived);
      await queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
    } catch {
      // The details panel keeps its state so the user can retry.
    }
  };

  const [conversationMuteTick, setConversationMuteTick] = useState(0);
  const toggleConversationMute = () => {
    const conversationId = selectedChat?.id;
    if (!conversationId) return;
    setConversationMuted(conversationId, !isConversationMuted(conversationId));
    // localStorage is not reactive; bump a tick so the bell re-renders.
    setConversationMuteTick((tick) => tick + 1);
  };

  const handleFileChange = (file?: File) => {
    if (!file) return;
    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
    setAttachment(true);
    setUploadError("");
  };

  const emitTyping = (conversationId: string, isTyping: boolean) => {
    const session = authClient.getSession();
    if (!session) return;
    connectChatSocket(session.token).emit("chat:typing", { conversationId, isTyping });
  };

  const handleMessageTyping = (value: string) => {
    setMessage(value);
    const conversationId = activeConversationId;
    if (!conversationId) return;
    if (value.trim()) {
      const now = Date.now();
      // Re-announce at most every 2s so the receiver's expiry timer keeps refreshing.
      if (now - lastTypingSentAt.current > TYPING_REANNOUNCE_MS) {
        lastTypingSentAt.current = now;
        emitTyping(conversationId, true);
      }
      if (stopTypingTimer.current !== null) window.clearTimeout(stopTypingTimer.current);
      stopTypingTimer.current = window.setTimeout(() => {
        stopTypingTimer.current = null;
        lastTypingSentAt.current = 0;
        emitTyping(conversationId, false);
      }, TYPING_STOP_DELAY_MS);
    } else {
      if (stopTypingTimer.current !== null) {
        window.clearTimeout(stopTypingTimer.current);
        stopTypingTimer.current = null;
      }
      lastTypingSentAt.current = 0;
      emitTyping(conversationId, false);
    }
  };

  // Hydrate derived maps when the conversations query resolves.
  useEffect(() => {
    const data = conversationsQuery.data;
    if (!data) return;
    setUnreadCounts(Object.fromEntries(data.conversations.map((conversation) => [String(conversation._id), conversation.unreadCount ?? 0])));
    setSelectedId((current) => (current && data.conversations.some((conversation) => String(conversation._id) === current) ? current : String(data.conversations[0]?._id ?? "") || null));
  }, [conversationsQuery.data]);

  // Mirror the active conversation's query results into local message state.
  useEffect(() => {
    const data = messagesQuery.data;
    const conversationId = activeConversationId;
    if (!data || !conversationId) return;
    setMessages((current) => ({ ...current, [conversationId]: toViewMessages(data.messages, sessionUser?.id ?? "") }));
    if (data.pagination) {
      setPagination((current) => ({ ...current, [conversationId]: { page: data.pagination.page, pages: data.pagination.pages } }));
    }
  }, [messagesQuery.data, activeConversationId, sessionUser?.id]);

  // Mirror the shared-media query results.
  useEffect(() => {
    const data = mediaQuery.data;
    const conversationId = activeConversationId;
    if (!data || !conversationId) return;
    setMediaByConversation((current) => ({ ...current, [conversationId]: data.media.map((item) => ({ id: String(item._id), imageUrl: item.imageUrl })) }));
  }, [mediaQuery.data, activeConversationId]);

  // Connect once, then keep the query-backed state in sync with realtime events.
  useEffect(() => {
    const session = authClient.getSession();
    if (!session) return;
    const sessionUserId = session.user.id;

    const socket = connectChatSocket(session.token);
    // Connection health: shown as a banner whenever the realtime link is down.
    const markConnected = () => setSocketConnected(true);
    const markDisconnected = () => setSocketConnected(false);
    socket.on("connect", markConnected);
    socket.on("disconnect", markDisconnected);
    socket.on("connect_error", markDisconnected);
    socket.on("presence:snapshot", (payload: PresenceSnapshotPayload) => {
      if (Array.isArray(payload?.onlineUserIds)) setOnlineUserIds(new Set(payload.onlineUserIds.map(String)));
    });
    socket.on("presence:changed", (payload: PresenceChangedPayload) => {
      if (!payload?.userId || payload.userId === sessionUserId) return;
      setOnlineUserIds((current) => {
        const next = new Set(current);
        if (payload.online) next.add(payload.userId);
        else next.delete(payload.userId);
        return next;
      });
    });
    socket.on("chat:message", (incoming: ChatMessagePayload) => {
      // Refresh the conversation list so previews, unread counts, and ordering stay current.
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      setMessages((current) => {
        const list = current[incoming.conversationId] ?? [];
        if (list.some((item) => item.id === incoming._id)) return current;
        const rendered = toMessage(incoming, sessionUserId);
        if (rendered.own) {
          // Replace the optimistic copy with the confirmed message from the echo.
          const optimisticIndex = list.findIndex((item) => item.id.startsWith("optimistic-"));
          if (optimisticIndex !== -1) {
            const next = [...list];
            next[optimisticIndex] = rendered;
            return { ...current, [incoming.conversationId]: next };
          }
        }
        return { ...current, [incoming.conversationId]: [...list, rendered] };
      });
      if (incoming.senderId !== sessionUserId) {
        // Desktop notification for messages that arrive while the app is in the
        // background and notifications are enabled for this account.
        if (!isMuted(sessionUserId) && incoming.conversationId !== activeConversationIdRef.current) {
          const sender = chats.find((chat) => chat.id === incoming.conversationId)?.name ?? "New message";
          showMessageNotification({
            title: sender,
            body: incoming.text ?? "📷 Shared an image",
            conversationId: incoming.conversationId,
          });
        }
        setUnreadCounts((current) => ({ ...current, [incoming.conversationId]: (current[incoming.conversationId] ?? 0) + 1 }));
        if (incoming.conversationId === activeConversationIdRef.current) {
          // Viewing it right now: acknowledge immediately so the sender's ticks flip.
          socket.emit("chat:read", { conversationId: incoming.conversationId });
        }
      } else if (incoming.imageUrl) {
        // Own sent image: add it to the shared-media grid too.
        setMediaByConversation((current) => {
          const list = current[incoming.conversationId] ?? [];
          if (list.some((media) => media.id === String(incoming._id))) return current;
          return { ...current, [incoming.conversationId]: [{ id: String(incoming._id), imageUrl: incoming.imageUrl! }, ...list] };
        });
      }
    });
    socket.on("chat:typing", (payload: ChatTypingPayload) => {
      if (!payload?.conversationId || payload.userId === sessionUserId) return;
      const { conversationId, userId, isTyping } = payload;
      setTypingByConversation((current) => {
        const existing = current[conversationId] ?? [];
        const without = existing.filter((id) => id !== userId);
        if (!isTyping) return without.length === existing.length ? current : { ...current, [conversationId]: without };
        return { ...current, [conversationId]: [...without, userId] };
      });
      const timerKey = `${conversationId}:${userId}`;
      const existingTimer = typingExpiryTimers.current[timerKey];
      if (existingTimer) {
        window.clearTimeout(existingTimer);
        delete typingExpiryTimers.current[timerKey];
      }
      if (isTyping) {
        // Safety net: drop the indicator if the stop event is lost (tab closed, dropoff).
        typingExpiryTimers.current[timerKey] = window.setTimeout(() => {
          delete typingExpiryTimers.current[timerKey];
          setTypingByConversation((current) => ({ ...current, [conversationId]: (current[conversationId] ?? []).filter((id) => id !== userId) }));
        }, TYPING_EXPIRY_MS);
      }
    });
    socket.on("chat:read", (payload: ChatReadPayload) => {
      if (!payload?.conversationId || !payload.userId || payload.userId === sessionUserId) return;
      setMessages((current) => {
        const list = current[payload.conversationId];
        if (!list?.length) return current;
        return { ...current, [payload.conversationId]: list.map((item) => (item.own && !item.read ? { ...item, read: true } : item)) };
      });
    });

    return () => {
      socket.off("connect", markConnected);
      socket.off("disconnect", markDisconnected);
      socket.off("connect_error", markDisconnected);
      socket.off("chat:message");
      socket.off("chat:typing");
      socket.off("chat:read");
      socket.off("presence:snapshot");
      socket.off("presence:changed");
      Object.values(typingExpiryTimers.current).forEach((timer) => window.clearTimeout(timer));
      typingExpiryTimers.current = {};
      disconnectChatSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Join/leave side effects for the active conversation.
  useEffect(() => {
    const session = authClient.getSession();
    if (!session || !activeConversationId) return;
    setUnreadCounts((current) => ({ ...current, [activeConversationId]: 0 }));
    const socket = connectChatSocket(session.token);
    socket.emit("conversation:join", activeConversationId);
    socket.emit("chat:read", { conversationId: activeConversationId });
    return () => {
      socket.emit("chat:typing", { conversationId: activeConversationId, isTyping: false });
      socket.emit("conversation:leave", activeConversationId);
      if (stopTypingTimer.current !== null) {
        window.clearTimeout(stopTypingTimer.current);
        stopTypingTimer.current = null;
      }
      lastTypingSentAt.current = 0;
    };
  }, [activeConversationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedUserQuery(userQuery), 250);
    return () => window.clearTimeout(timer);
  }, [userQuery]);

  useEffect(() => {
    setDebouncedMessageQuery(messageQuery);
  }, [messageQuery]);

  // Unread badge in the tab title, e.g. "(3) loop. — conversations in sync".
  useEffect(() => {
    const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
    document.title = totalUnread > 0 ? `(${totalUnread}) ${BASE_TITLE}` : BASE_TITLE;
  }, [unreadCounts]);

  // Clicking a desktop notification focuses that conversation.
  useEffect(() => {
    const handleOpenConversation = (event: Event) => {
      const conversationId = (event as CustomEvent<{ conversationId?: string }>).detail?.conversationId;
      if (!conversationId) return;
      setSelectedId(conversationId);
      setShowSidebar(false);
    };
    window.addEventListener(OPEN_CONVERSATION_EVENT, handleOpenConversation);
    return () => window.removeEventListener(OPEN_CONVERSATION_EVENT, handleOpenConversation);
  }, []);

  const startConversation = async (memberId: string) => {
    const session = authClient.getSession();
    if (!session) return;
    try {
      await createConversation(memberId);
      await queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      setUserSearchOpen(false);
      setUserQuery("");
      setDebouncedUserQuery("");
    } catch {
      // The people list stays open so the user can retry.
    }
  };

  const loadOlderMessages = async () => {
    const session = authClient.getSession();
    const conversationId = activeConversationId;
    if (!session || !conversationId || loadingOlder) return;
    const pageInfo = pagination[conversationId];
    if (!pageInfo || pageInfo.page >= pageInfo.pages) return;
    const nextPage = pageInfo.page + 1;
    setLoadingOlder(true);
    try {
      const data = await fetchMessages(conversationId, nextPage);
      setMessages((current) => {
        const existing = current[conversationId] ?? [];
        const known = new Set(existing.map((item) => item.id));
        // Prepend only messages we do not already have (edge overlap between pages).
        const older = toViewMessages(data.messages, session.user.id).filter((item) => !known.has(item.id));
        return { ...current, [conversationId]: [...older, ...existing] };
      });
      setPagination((current) => ({ ...current, [conversationId]: { page: data.pagination?.page ?? nextPage, pages: data.pagination?.pages ?? pageInfo.pages } }));
    } catch {
      // Keep the button available so the user can retry.
    } finally {
      setLoadingOlder(false);
    }
  };

  const sendMessage = async () => {
    if ((!message.trim() && !selectedFile) || uploading || !selectedChat) return;
    const session = authClient.getSession();
    if (!session) return;
    setUploading(Boolean(selectedFile));
    setUploadError("");
    try {
      let imageUrl: string | undefined;
      if (selectedFile) {
        const upload = await uploadChatImage(selectedFile);
        imageUrl = upload.imageUrl;
      }
      const text = message.trim();
      const conversationId = selectedChat.id;
      setMessages((current) => ({
        ...current,
        [conversationId]: [
          ...(current[conversationId] ?? []),
          { id: `optimistic-${Date.now()}`, text: text || (imageUrl ? "Shared an image" : ""), time: "Just now", own: true, read: false, imageUrl },
        ],
      }));
      if (socketConnected) {
        // Realtime path: the socket echo also replaces the optimistic message.
        connectChatSocket(session.token).emit("chat:message", { conversationId, text: text || undefined, imageUrl });
      } else {
        // Serverless deployments (e.g. Netlify) have no persistent websocket.
        // Send over REST, then swap the optimistic copy for the saved message.
        const saved = await sendMessageRest(conversationId, text || undefined, imageUrl);
        setMessages((current) => ({
          ...current,
          [conversationId]: (current[conversationId] ?? []).map((item) =>
            item.id.startsWith("optimistic-") ? toMessage(saved.message, session.user.id) : item,
          ),
        }));
      }
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      if (stopTypingTimer.current !== null) {
        window.clearTimeout(stopTypingTimer.current);
        stopTypingTimer.current = null;
      }
      lastTypingSentAt.current = 0;
      emitTyping(conversationId, false);
      setMessage("");
      setAttachment(false);
      setSelectedFile(null);
      setImagePreview("");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Track the last painted scroll metrics so the layout effect below can anchor
  // the viewport when content is prepended at the top.
  useEffect(() => {
    const container = scrollRef.current;
    if (container) lastScrollMetricsRef.current = { scrollTop: container.scrollTop, scrollHeight: container.scrollHeight };
  });

  useLayoutEffect(() => {
    const container = scrollRef.current;
    const conversationId = activeConversationId;
    if (!container || !conversationId) return;
    const metrics = lastScrollMetricsRef.current;
    const nextCount = (messages[conversationId] ?? []).length;
    const previousCount = prevMessageCountRef.current[conversationId] ?? 0;
    prevMessageCountRef.current[conversationId] = nextCount;
    if (metrics && nextCount > previousCount && metrics.scrollTop <= 4) {
      container.scrollTop = container.scrollHeight - metrics.scrollHeight + metrics.scrollTop;
    }
  }, [messages, activeConversationId]);

  return (
    <main className="min-h-screen bg-[#f6f8fb] p-3 text-[#17213a] sm:p-5 lg:p-8">
      {!socketConnected && (
        <div role="status" className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-[#fff4e5] py-2 text-xs font-bold text-[#8a5a12] shadow-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#e0a13a]" />
          Connection lost — reconnecting…
        </div>
      )}
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1440px] overflow-hidden rounded-[28px] border border-[#e6eaf1] bg-white shadow-[0_22px_70px_rgba(39,50,77,0.10)] lg:min-h-[calc(100vh-4rem)]">
        <Sidebar
          sessionUser={sessionUser}
          showSidebar={showSidebar}
          chats={visibleChats}
          loading={conversationsQuery.isPending}
          selectedId={selectedId}
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived(!showArchived)}
          query={query}
          onQueryChange={setQuery}
          userSearchOpen={userSearchOpen}
          onToggleUserSearch={() => setUserSearchOpen(!userSearchOpen)}
          userQuery={userQuery}
          onUserQueryChange={setUserQuery}
          userResults={userSearchQuery.data?.users ?? []}
          onStartConversation={startConversation}
          unreadCounts={unreadCounts}
          typingByConversation={typingByConversation}
          chatIsOnline={chatIsOnline}
          onSelectConversation={(id) => { setSelectedId(id); setShowSidebar(false); }}
          onLogout={logout}
        />

        {selectedChat ? (
          <section className="flex min-w-0 flex-1 flex-col bg-white">
            <ChatHeader
              chat={selectedChat}
              online={selectedChatIsOnline}
              onOpenSidebar={() => setShowSidebar(true)}
              onToggleSearch={() => setMessageSearchOpen(!messageSearchOpen)}
              onOpenDetails={() => setDetailsCollapsed(false)}
            />
            <MessageList
              ref={scrollRef}
              messages={messages[selectedChat.id] ?? []}
              loading={messagesQuery.isPending}
              hasMore={hasMoreMessages}
              loadingOlder={loadingOlder}
              onLoadOlder={loadOlderMessages}
              typingNames={typingNames}
              searchOpen={messageSearchOpen}
              searchQuery={messageQuery}
              onSearchQueryChange={setMessageQuery}
              searchResults={messageSearchQuery.data?.messages ?? []}
              onCloseSearch={() => setMessageSearchOpen(false)}
              onOpenImage={setLightboxImage}
            />
            <MessageComposer
              value={message}
              onValueChange={handleMessageTyping}
              onSend={sendMessage}
              onFileSelect={handleFileChange}
              attachmentName={selectedFile?.name}
              attachmentPreviewUrl={imagePreview}
              onClearAttachment={() => { setAttachment(false); setSelectedFile(null); setImagePreview(""); }}
              uploading={uploading}
              error={uploadError}
            />
          </section>
        ) : (
          <section className="flex min-w-0 flex-1 flex-col items-center justify-center bg-white px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0efff] text-[#6054d8]"><MessageCircle size={26} /></div>
            <h2 className="mt-4 text-sm font-extrabold text-[#30384e]">{conversationsQuery.isPending ? "Loading your conversations..." : "No conversation selected"}</h2>
            <p className="mt-1 max-w-[260px] text-xs text-[#9da5b5]">{conversationsQuery.isPending ? "Hang tight while we fetch your chats." : "Start a new conversation with the + button in the sidebar."}</p>
          </section>
        )}

        {selectedChat && !detailsCollapsed && (
          <DetailsPanel
            chat={selectedChat}
            online={selectedChatIsOnline}
            media={mediaByConversation[selectedChat.id] ?? []}
            conversationMuted={conversationMuteTick >= 0 && isConversationMuted(selectedChat.id)}
            onToggleConversationMute={toggleConversationMute}
            onToggleArchive={toggleArchiveConversation}
            onCollapse={() => setDetailsCollapsed(true)}
            onOpenImage={setLightboxImage}
          />
        )}
      </div>
      {lightboxImage && <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage("")} />}
    </main>
  );
}
