import { Info, Menu, Search } from "lucide-react";
import { Avatar } from "./Avatar";
import { formatLastSeen, type Chat } from "./chat-utils";

export function ChatHeader({
  chat,
  online,
  onOpenSidebar,
  onToggleSearch,
  onOpenDetails,
}: {
  chat: Chat;
  online: boolean;
  onOpenSidebar: () => void;
  onToggleSearch: () => void;
  onOpenDetails: () => void;
}) {
  return (
    <header className="flex h-[88px] shrink-0 items-center justify-between border-b border-[#edf0f5] px-5 sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onOpenSidebar} className="rounded-lg p-2 text-[#64708b] hover:bg-[#f4f5fb] sm:hidden" aria-label="Open conversations"><Menu size={20} /></button>
        <Avatar chat={chat} size="lg" online={online} />
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-extrabold tracking-[-0.02em] text-[#252d45]">{chat.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#8791a5]">
            <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-[#46bf78]" : "bg-[#bac1cc]"}`} />
            {online ? "Active now" : formatLastSeen(chat.lastSeenAt)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 text-[#929bad] sm:gap-2">
        <button onClick={onToggleSearch} className="rounded-xl p-2.5 hover:bg-[#f4f5fb] hover:text-[#6054d8]" aria-label="Search messages"><Search size={18} /></button>
        <button onClick={onOpenDetails} className="hidden rounded-xl p-2.5 hover:bg-[#f4f5fb] hover:text-[#6054d8] xl:block" aria-label="Conversation details" title="Show details panel"><Info size={18} /></button>
      </div>
    </header>
  );
}
