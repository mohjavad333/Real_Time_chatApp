import { avatarColors, type Chat } from "./chat-utils";

export function Avatar({ chat, online, size = "md" }: { chat: Chat; online: boolean; size?: "sm" | "md" | "lg" }) {
  return (
    <div className={`relative flex shrink-0 items-center justify-center rounded-full font-bold tracking-[-0.04em] ${avatarColors[chat.color]} ${size === "lg" ? "h-12 w-12 text-sm" : size === "sm" ? "h-9 w-9 text-[11px]" : "h-10 w-10 text-xs"}`}>
      {chat.initials}
      {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#46bf78]" />}
    </div>
  );
}
