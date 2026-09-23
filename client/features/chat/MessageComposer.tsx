import { useRef } from "react";
import { Paperclip, Send, Smile, X } from "lucide-react";

export function MessageComposer({
  value,
  onValueChange,
  onSend,
  onFileSelect,
  attachmentName,
  attachmentPreviewUrl,
  onClearAttachment,
  uploading,
  error,
}: {
  value: string;
  onValueChange: (value: string) => void;
  onSend: () => void;
  onFileSelect: (file?: File) => void;
  attachmentName?: string;
  attachmentPreviewUrl: string;
  onClearAttachment: () => void;
  uploading: boolean;
  error: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAttachment = Boolean(attachmentName || attachmentPreviewUrl);

  return (
    <div className="border-t border-[#edf0f5] px-5 py-5 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-2xl">
        {hasAttachment && <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#f4f3ff] px-3 py-2 text-xs text-[#6054d8]">{attachmentPreviewUrl && <img src={attachmentPreviewUrl} alt="Selected upload preview" className="h-12 w-12 rounded-lg object-cover" />}<span className="truncate">{attachmentName ?? "Image ready to send"}</span><button onClick={onClearAttachment} className="ml-auto"><X size={15} /></button></div>}
        {error && <p className="mb-2 rounded-lg bg-[#fff0ee] px-3 py-2 text-xs text-[#c45748]">{error}</p>}
        <div className="flex items-center gap-2 rounded-2xl border border-[#e4e7ef] bg-[#fbfcfd] px-2.5 py-2 shadow-[0_4px_14px_rgba(48,58,88,0.04)]">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => onFileSelect(event.target.files?.[0])} />
          <button onClick={() => fileInputRef.current?.click()} className="rounded-xl p-2 text-[#9ca5b6] hover:bg-[#f0efff] hover:text-[#6054d8]" aria-label="Attach image"><Paperclip size={18} /></button>
          <input value={value} onChange={(e) => onValueChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSend()} placeholder="Write a message..." className="min-w-0 flex-1 bg-transparent px-1 text-[13px] text-[#28324a] outline-none placeholder:text-[#a7afbd]" />
          <button className="hidden rounded-xl p-2 text-[#9ca5b6] hover:bg-[#f0efff] hover:text-[#6054d8] sm:block" aria-label="Add emoji"><Smile size={18} /></button>
          <button disabled={uploading} onClick={onSend} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6054d8] text-white shadow-[0_5px_12px_rgba(96,84,216,0.22)] transition hover:bg-[#5147c4]" aria-label="Send message"><Send size={16} /></button>
        </div>
        <p className="mt-2 hidden text-center text-[10px] text-[#b5bcc9] sm:block">Press Enter to send</p>
      </div>
    </div>
  );
}
