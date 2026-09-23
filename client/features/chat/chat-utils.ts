import type {
  ChatMessagePayload,
  ConversationDto,
  ConversationMemberDto,
  MessageDto,
} from "@shared/api";

export type Chat = {
  id: string;
  name: string;
  initials: string;
  color: string;
  message: string;
  time: string;
  memberIds: string[];
  /** ISO timestamp of the other member's last activity, if the API returned one. */
  lastSeenAt?: string;
  /** Whether the session user has archived this conversation. */
  archived: boolean;
};

export type Message = {
  id: string;
  text: string;
  time: string;
  own?: boolean;
  read?: boolean;
  imageUrl?: string;
};

export type SharedMedia = { id: string; imageUrl: string };

export type UserSearchResult = { _id: string; name?: string; email?: string };

export type MessageSearchResult = { _id: string; text?: string; createdAt?: string };

export const avatarColors: Record<string, string> = {
  coral: "bg-[#f18b76] text-[#702d23]",
  violet: "bg-[#a995eb] text-[#382c70]",
  blue: "bg-[#8bb8e8] text-[#183b62]",
  amber: "bg-[#f0bd72] text-[#633d0d]",
  green: "bg-[#91c6a4] text-[#17482b]",
};

export const avatarColorCycle = ["coral", "violet", "blue", "amber", "green"];

export function initialsFor(name: string | undefined) {
  const safeName = name ?? "";
  return (
    safeName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "C"
  );
}

export function formatTime(value?: string) {
  if (!value) return "Now";
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function toChat(conversation: ConversationDto, sessionUserId: string, index: number): Chat {
  const members = conversation.memberIds ?? [];
  const other = members.find((member) => member._id !== sessionUserId) ?? members[0];
  const name = other?.name ?? "Conversation";
  const lastMessage = conversation.lastMessageId;
  return {
    id: String(conversation._id),
    name,
    initials: initialsFor(name),
    color: avatarColorCycle[index % avatarColorCycle.length],
    message: lastMessage?.text ?? (lastMessage?.imageUrl ? "Shared an image" : "Start a conversation"),
    time: formatTime(conversation.updatedAt),
    memberIds: members.map((member) => String(member._id)),
    lastSeenAt: other?.lastSeenAt,
    archived: (conversation.archivedFor ?? []).some((memberId) => String(memberId) === sessionUserId),
  };
}

/** Human-friendly "last seen" label, e.g. "last seen today at 3:05 PM". */
export function formatLastSeen(value: string | undefined): string {
  if (!value) return "Last seen recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Last seen recently";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `last seen today at ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `last seen yesterday at ${time}`;
  return `last seen ${date.toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

export function toMessage(item: MessageDto | ChatMessagePayload, sessionUserId: string): Message {
  return {
    id: String(item._id),
    text: item.text ?? "",
    time: formatTime(item.createdAt),
    own: item.senderId === sessionUserId,
    // For your own messages, "read" means someone else has it in their readBy list;
    // for incoming messages, it means you are in theirs.
    read:
      item.senderId === sessionUserId
        ? (item.readBy ?? []).some((readerId) => String(readerId) !== sessionUserId)
        : (item.readBy ?? []).includes(sessionUserId),
    imageUrl: item.imageUrl,
  };
}
