import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export type ChatSocket = Socket;

export function connectChatSocket(token: string): Socket {
  socket ??= io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, {
    autoConnect: false,
    // Socket.IO retries on its own; these are tuned for a chat app that should
    // recover quickly from short network drops without hammering the server.
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: { token },
  });
  socket.auth = { token };
  socket.connect();
  return socket;
}

export function disconnectChatSocket() {
  socket?.disconnect();
  socket = null;
}
