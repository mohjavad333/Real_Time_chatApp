import type { Server, Socket } from "socket.io";
import { User } from "../models/User";
import { createMessage, markConversationRead } from "../services/chat.service";
import { verifyToken } from "../services/auth.service";
import { socketEvents } from "./events";

type AuthenticatedSocket = Socket & { userId: string };

const roomFor = (conversationId: string) => `conversation:${conversationId}`;

// userId -> number of live sockets for that user (covers multi-tab).
const onlineUsers = new Map<string, number>();

function serializeMessage(message: any) {
  return {
    ...message.toObject(),
    _id: message._id.toString(),
    conversationId: message.conversationId.toString(),
    senderId: message.senderId.toString(),
    readBy: message.readBy.map((userId: any) => userId.toString()),
  };
}

export function registerSocketHandlers(io: Server) {
  io.use((socket, next) => {
    const token = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : undefined;
    if (!token) return next(new Error("Authentication required"));
    try {
      (socket as AuthenticatedSocket).userId = verifyToken(token);
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const wentOnline = (onlineUsers.get(socket.userId) ?? 0) === 0;
    onlineUsers.set(socket.userId, (onlineUsers.get(socket.userId) ?? 0) + 1);

    // Keep "last seen" fresh: stamped whenever a user's first live socket connects.
    if (wentOnline) {
      void User.findByIdAndUpdate(socket.userId, { lastSeenAt: new Date() }).catch(() => {
        // Presence must never break the chat because of a transient DB error.
      });
    }

    socket.emit(socketEvents.presenceSnapshot, { onlineUserIds: [...onlineUsers.keys()] });
    if (wentOnline) {
      socket.broadcast.emit(socketEvents.presenceChanged, { userId: socket.userId, online: true });
    }

    socket.on("conversation:join", (conversationId: string) => {
      socket.join(roomFor(conversationId));
    });

    socket.on("conversation:leave", (conversationId: string) => {
      socket.leave(roomFor(conversationId));
    });

    socket.on(socketEvents.chatMessage, async (payload: { conversationId: string; text?: string; imageUrl?: string }, callback?: (result: unknown) => void) => {
      try {
        const message = await createMessage(socket.userId, payload.conversationId, { text: payload.text, imageUrl: payload.imageUrl });
        const serializedMessage = serializeMessage(message);
        io.to(roomFor(String(payload.conversationId))).emit(socketEvents.chatMessage, serializedMessage);
        callback?.({ ok: true, message: serializedMessage });
      } catch (error) {
        callback?.({ ok: false, message: error instanceof Error ? error.message : "Unable to send message" });
      }
    });

    socket.on(socketEvents.chatTyping, (payload: { conversationId: string; isTyping: boolean }) => {
      socket.to(roomFor(payload.conversationId)).emit(socketEvents.chatTyping, { ...payload, userId: socket.userId });
    });

    socket.on(socketEvents.chatRead, async (payload: { conversationId: string }) => {
      try {
        await markConversationRead(socket.userId, payload.conversationId);
        socket.to(roomFor(payload.conversationId)).emit(socketEvents.chatRead, { conversationId: payload.conversationId, userId: socket.userId });
      } catch {
        socket.emit("chat:error", { message: "Unable to mark conversation as read" });
      }
    });

    socket.on("disconnect", () => {
      const remaining = (onlineUsers.get(socket.userId) ?? 1) - 1;
      if (remaining <= 0) {
        onlineUsers.delete(socket.userId);
        socket.broadcast.emit(socketEvents.presenceChanged, { userId: socket.userId, online: false });
        // Final "last seen" stamp for when the user went offline.
        void User.findByIdAndUpdate(socket.userId, { lastSeenAt: new Date() }).catch(() => {
          // Ignore: best-effort timestamp only.
        });
      } else {
        onlineUsers.set(socket.userId, remaining);
      }
    });
  });
}
