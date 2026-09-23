import { useEffect, useRef, useState } from "react";
import { Archive, Bell, BellOff, ChevronLeft, MessageCircle, MoreHorizontal, Plus, Search, Settings } from "lucide-react";
import { ConversationList } from "./ConversationList";
import { initialsFor, type Chat, type UserSearchResult } from "./chat-utils";
import { isMuted, permissionState, requestPermission, setMuted } from "@/lib/notifications";
import type { ChatUser } from "@shared/api";

/** Working settings menu: notifications toggle + sign out. */
function SettingsMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-2 text-[#a4acbd] transition hover:bg-[#f4f5fb] hover:text-[#6054d8]"
        aria-label="Settings"
        aria-expanded={open}
      >
        <Settings size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-48 rounded-xl border border-[#e6eaf1] bg-white py-1.5 shadow-[0_12px_40px_rgba(39,50,77,0.16)]">
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-bold text-[#c45748] hover:bg-[#fff5f3]"
          >
            <MoreHorizontal size={15} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationBell({ sessionUserId }: { sessionUserId: string }) {
  const [muted, setMutedState] = useState(() => isMuted(sessionUserId));
  const [permission, setPermission] = useState(() => permissionState());

  const toggle = async () => {
    if (!muted && permission !== "granted") {
      // Enable: ask the browser for permission first (must be a user gesture).
      const result = await requestPermission();
      setPermission(result);
      if (result !== "granted") return; // Denied/unsupported -> keep current state.
      setMuted(sessionUserId, false);
      setMutedState(false);
      return;
    }
    const next = !muted;
    setMuted(sessionUserId, next);
    setMutedState(next);
  };

  const enabled = permission === "granted" && !muted;
  return (
    <button
      onClick={toggle}
      className="rounded-lg p-2 text-[#a4acbd] transition hover:bg-[#f4f5fb] hover:text-[#6054d8]"
      aria-label={enabled ? "Mute notifications" : "Enable notifications"}
      title={
        permission === "unsupported"
          ? "Notifications are not supported in this browser"
          : permission === "denied"
            ? "Notifications are blocked in browser settings"
            : enabled
              ? "Notifications on — click to mute"
              : "Notifications off — click to enable"
      }
    >
      {enabled ? <Bell size={18} /> : <BellOff size={18} />}
    </button>
  );
}

export function Sidebar({
  sessionUser,
  showSidebar,
  chats,
  loading,
  selectedId,
  showArchived,
  onToggleArchived,
  query,
  onQueryChange,
  userSearchOpen,
  onToggleUserSearch,
  userQuery,
  onUserQueryChange,
  userResults,
  onStartConversation,
  unreadCounts,
  typingByConversation,
  chatIsOnline,
  onSelectConversation,
  onLogout,
}: {
  sessionUser: ChatUser | null;
  showSidebar: boolean;
  chats: Chat[];
  loading: boolean;
  selectedId: string | null;
  showArchived: boolean;
  onToggleArchived: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  userSearchOpen: boolean;
  onToggleUserSearch: () => void;
  userQuery: string;
  onUserQueryChange: (value: string) => void;
  userResults: UserSearchResult[];
  onStartConversation: (memberId: string) => void;
  unreadCounts: Record<string, number>;
  typingByConversation: Record<string, string[]>;
  chatIsOnline: (chat: Chat) => boolean;
  onSelectConversation: (id: string) => void;
  onLogout: () => void;
}) {
  return (
    <aside className={`${showSidebar ? "absolute inset-y-3 left-3 z-20 flex shadow-2xl sm:inset-y-5 sm:left-5" : "hidden"} w-[300px] flex-col border-r border-[#edf0f5] bg-white sm:relative sm:inset-0 sm:flex lg:w-[340px]`}>      <div className="flex items-center justify-between px-6 pb-5 pt-7">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6054d8] text-white shadow-[0_6px_16px_rgba(96,84,216,0.24)]"><MessageCircle size={19} strokeWidth={2.6} /></div>
          <span className="text-[21px] font-extrabold tracking-[-0.05em] text-[#222844]">loop<span className="text-[#6054d8]">.</span></span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell sessionUserId={sessionUser?.id ?? ""} />
          <SettingsMenu onLogout={onLogout} />
        </div>
      </div>
      <div className="px-5 pb-5"><div className="flex items-center gap-3 rounded-xl bg-[#f4f6fa] px-3.5 py-2.5 text-[#9da5b5]"><Search size={17} /><input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Search conversations" className="w-full bg-transparent text-[13px] text-[#252d45] outline-none placeholder:text-[#aab1c0]" /></div></div>
      <div className="flex items-center justify-between px-6 pb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#a6adbd]">{showArchived ? "Archived" : "Messages"}</p>
        <button onClick={onToggleUserSearch} className="rounded-lg p-1.5 text-[#6054d8] hover:bg-[#f1f0ff]" aria-label="New conversation"><Plus size={17} /></button>
      </div>
      <div className="px-3 pb-2">
        <button
          onClick={onToggleArchived}
          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold transition ${showArchived ? "bg-[#f0efff] text-[#4d43bd]" : "text-[#8791a5] hover:bg-[#f8f9fc]"}`}
        >
          <Archive size={15} />
          {showArchived ? "Back to chats" : "Archived"}
          {showArchived && <ChevronLeft size={14} className="ml-auto" />}
        </button>
      </div>
      {userSearchOpen && (
        <div className="mb-3 rounded-2xl bg-[#f7f7ff] p-3">
          <input autoFocus value={userQuery} onChange={(event) => onUserQueryChange(event.target.value)} placeholder="Search people..." className="w-full rounded-lg border border-[#e2e4f3] bg-white px-3 py-2 text-xs outline-none focus:border-[#6054d8]" />
          {userResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {userResults.map((user) => (
                <button key={user._id} onClick={() => onStartConversation(user._id)} className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#a995eb] text-[10px] font-bold text-[#382c70]">{user.name?.slice(0, 2).toUpperCase()}</span>
                  <span><span className="block text-xs font-bold text-[#30384e]">{user.name}</span><span className="block text-[10px] text-[#9ca5b5]">{user.email}</span></span>
                </button>
              ))}
            </div>
          )}
          {userQuery.trim().length >= 2 && userResults.length === 0 && <p className="mt-2 px-1 text-[10px] text-[#9ca5b5]">No people found.</p>}
        </div>
      )}
      <ConversationList
        chats={chats}
        loading={loading}
        selectedId={selectedId}
        query={query}
        unreadCounts={unreadCounts}
        typingByConversation={typingByConversation}
        chatIsOnline={chatIsOnline}
        onSelect={onSelectConversation}
      />
      <div className="border-t border-[#edf0f5] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#27304b] text-xs font-bold text-white">{initialsFor(sessionUser?.name ?? "You")}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[#30384e]">{sessionUser?.name ?? "You"}</p>
            <p className="text-[11px] text-[#a1a9ba]">Available</p>
          </div>
          <button onClick={onLogout} aria-label="Log out" className="rounded-lg p-1 text-[#adb4c1] hover:bg-[#f4f5fb] hover:text-[#6054d8]"><MoreHorizontal size={18} /></button>
        </div>
      </div>
    </aside>
  );
}
