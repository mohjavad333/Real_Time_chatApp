import { Avatar } from "./Avatar";
import { type Chat } from "./chat-utils";

export function ConversationList({
  chats,
  loading,
  selectedId,
  query,
  unreadCounts,
  typingByConversation,
  chatIsOnline,
  onSelect,
}: {
  chats: Chat[];
  loading: boolean;
  selectedId: string | null;
  query: string;
  unreadCounts: Record<string, number>;
  typingByConversation: Record<string, string[]>;
  chatIsOnline: (chat: Chat) => boolean;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3 px-3 py-2">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-[#eef0f5]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 animate-pulse rounded bg-[#eef0f5]" />
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-[#f1f3f7]" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (chats.length === 0) {
    return <p className="px-6 py-8 text-center text-xs text-[#a5adbd]">{query ? "No conversations match your search." : "No conversations yet. Tap + to start one."}</p>;
  }
  return (
    <div className="scrollbar-hide flex-1 overflow-y-auto px-3">
      {chats.map((chat) => {
        const isTyping = (typingByConversation[chat.id] ?? []).length > 0;
        const unread = unreadCounts[chat.id] ?? 0;
        return (
          <button
            key={chat.id}
            onClick={() => onSelect(chat.id)}
            className={`group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${selectedId === chat.id ? "bg-[#f0efff]" : "hover:bg-[#f8f9fc]"}`}
          >
            <Avatar chat={chat} online={chatIsOnline(chat)} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className={`truncate text-[13px] font-bold ${selectedId === chat.id ? "text-[#4d43bd]" : "text-[#30384e]"}`}>{chat.name}</span>
                <span className="shrink-0 text-[10px] text-[#a5adbd]">{chat.time}</span>
              </span>
              <span className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-[#8f98aa]">{isTyping ? "typing…" : chat.message}</span>
                {unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#6054d8] px-1 text-[10px] font-bold text-white">{unread}</span>}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
