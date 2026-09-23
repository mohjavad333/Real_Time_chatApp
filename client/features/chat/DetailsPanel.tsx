import { Archive, ArchiveRestore, Bell, BellOff, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar } from "./Avatar";
import { type Chat, type SharedMedia } from "./chat-utils";

export function DetailsPanel({
  chat,
  online,
  media,
  conversationMuted,
  onToggleConversationMute,
  onToggleArchive,
  onCollapse,
  onOpenImage,
}: {
  chat: Chat;
  online: boolean;
  media: SharedMedia[];
  conversationMuted: boolean;
  onToggleConversationMute: () => void;
  onToggleArchive: () => void;
  onCollapse: () => void;
  onOpenImage: (imageUrl: string) => void;
}) {
  return (
    <aside className="hidden w-[245px] shrink-0 border-l border-[#edf0f5] bg-[#fcfcfd] px-5 py-7 xl:block">
      <div className="mb-7 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#a4acbc]">Details</p>
        <button onClick={onCollapse} className="text-[#a4acbc] hover:text-[#6054d8]" aria-label="Collapse details" title="Hide details panel">
          <ChevronDown size={16} />
        </button>
      </div>
      <div className="flex flex-col items-center">
        <Avatar chat={chat} size="lg" online={online} />
        <h2 className="mt-3 text-[14px] font-extrabold text-[#30384e]">{chat.name}</h2>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onToggleConversationMute}
            className={`rounded-xl p-2.5 transition ${conversationMuted ? "bg-[#6054d8] text-white" : "bg-[#f0efff] text-[#6054d8] hover:bg-[#e6e4fb]"}`}
            aria-label={conversationMuted ? "Unmute notifications for this conversation" : "Mute notifications for this conversation"}
            title={conversationMuted ? "Notifications muted for this conversation" : "Mute notifications for this conversation"}
          >
            {conversationMuted ? <BellOff size={16} /> : <Bell size={16} />}
          </button>
          <button
            onClick={onToggleArchive}
            className="rounded-xl bg-[#f0efff] p-2.5 text-[#6054d8] transition hover:bg-[#e6e4fb]"
            aria-label={chat.archived ? "Unarchive conversation" : "Archive conversation"}
            title={chat.archived ? "Move back to chats" : "Hide from the chat list (find it under Archived)"}
          >
            {chat.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
          </button>
        </div>
      </div>
      <div className="mt-9 border-t border-[#edf0f5] pt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#596278]">Shared media</span>
          <span className="text-[11px] text-[#a4acbc]">{media.length}</span>
        </div>
        {media.length === 0 ? (
          <p className="mt-3 text-[11px] text-[#a4acbc]">No images shared yet.</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {media.map((item) => (
              <button key={item.id} type="button" onClick={() => onOpenImage(item.imageUrl)} className="aspect-square overflow-hidden rounded-lg bg-[#eef0f5] transition hover:opacity-80" aria-label="Open shared image">
                <img src={item.imageUrl} alt="Shared image" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
