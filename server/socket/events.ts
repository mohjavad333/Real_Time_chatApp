export const socketEvents = {
  chatMessage: "chat:message",
  chatTyping: "chat:typing",
  chatRead: "chat:read",
  presenceChanged: "presence:changed",
  presenceSnapshot: "presence:snapshot",
} as const;

export type SocketEventName = (typeof socketEvents)[keyof typeof socketEvents];
