import { forwardRef } from "react";
import { Check, CheckCheck } from "lucide-react";
import { type Message, type MessageSearchResult } from "./chat-utils";

export const MessageList = forwardRef<HTMLDivElement, {
  messages: Message[];
  loading: boolean;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  typingNames: string[];
  searchOpen: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchResults: MessageSearchResult[];
  onCloseSearch: () => void;
  onOpenImage: (imageUrl: string) => void;
}>(function MessageList(
  {
    messages,
    loading,
    hasMore,
    loadingOlder,
    onLoadOlder,
    typingNames,
    searchOpen,
    searchQuery,
    onSearchQueryChange,
    searchResults,
    onCloseSearch,
    onOpenImage,
  },
  ref,
) {
  return (
    <div ref={ref} className="flex-1 overflow-y-auto px-5 py-7 sm:px-10 lg:px-16">
      {searchOpen && (
        <div className="mx-auto mb-5 max-w-2xl rounded-2xl bg-[#f7f7ff] p-3">
          <input autoFocus value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="Search in this conversation..." className="w-full rounded-lg border border-[#e2e4f3] bg-white px-3 py-2 text-xs outline-none focus:border-[#6054d8]" />
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {searchResults.map((result) => (
                <button key={result._id} onClick={onCloseSearch} className="block w-full rounded-lg p-2 text-left text-xs text-[#596278] hover:bg-white">{result.text}</button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="mb-7 flex items-center gap-4">
        <div className="h-px flex-1 bg-[#eef0f5]" />
        <span className="rounded-full bg-[#f5f6f9] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a1a9b8]">Today</span>
        <div className="h-px flex-1 bg-[#eef0f5]" />
      </div>
      {!loading && hasMore && (
        <div className="-mt-3 mb-5 flex justify-center">
          <button onClick={onLoadOlder} disabled={loadingOlder} className="rounded-full border border-[#e4e7ef] bg-white px-4 py-1.5 text-[11px] font-bold text-[#6054d8] transition hover:bg-[#f0efff] disabled:cursor-wait disabled:opacity-60">
            {loadingOlder ? "Loading..." : "Load older messages"}
          </button>
        </div>
      )}
      <div className="mx-auto max-w-2xl space-y-4">
        {loading ? (
          <p className="py-10 text-center text-xs text-[#a5adbd]">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-xs text-[#a5adbd]">No messages yet — say hi 👋</p>
        ) : (
          messages.map((item) => (
            <div key={item.id} className={`flex ${item.own ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] sm:max-w-[66%] ${item.own ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`${item.own ? "rounded-2xl rounded-br-md bg-[#6054d8] text-white" : "rounded-2xl rounded-bl-md bg-[#f1f3f7] text-[#394258]"} px-4 py-3 text-[13px] leading-6 shadow-sm`}>
                  {item.imageUrl && <button type="button" onClick={() => onOpenImage(item.imageUrl!)} className="mb-2 block overflow-hidden rounded-xl"><img src={item.imageUrl} alt="Shared image, open full size" className="max-h-64 w-full rounded-xl object-cover transition hover:scale-[1.02]" /></button>}
                  {item.text && <span>{item.text}</span>}
                </div>
                <div className={`mt-1.5 flex items-center gap-1.5 px-1 text-[10px] text-[#a7afbd] ${item.own ? "flex-row-reverse" : ""}`}>
                  {item.time}
                  {item.own && (item.read ? <CheckCheck size={13} className="text-[#6054d8]" /> : <Check size={13} className="text-[#a7afbd]" />)}
                </div>
              </div>
            </div>
          ))
        )}
        {typingNames.length > 0 && (
          <div className="flex items-center gap-2 pt-2 text-[11px] text-[#a5adbb]">
            <span className="flex gap-0.5">
              <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#b4b9c9] [animation-delay:-0.3s]" />
              <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#b4b9c9] [animation-delay:-0.15s]" />
              <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#b4b9c9]" />
            </span>
            {typingNames[0].split(" ")[0]} is typing…
          </div>
        )}
      </div>
    </div>
  );
});
