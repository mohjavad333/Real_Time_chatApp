/**
 * E2E simulation: two users in two separate "browsers".
 * A creates a conversation, sends a message over socket, B must receive it.
 * Usage: pnpm exec tsx scripts/e2e-chat-delivery.ts
 */
import { io, Socket as ClientSocket } from "socket.io-client";

const BASE = "http://localhost:8080";

function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function api(path: string, method = "GET", body?: unknown, token?: string) {
  const response = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = parseJson(await response.text());
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

type Session = { user: { id: string; name: string }; token: string };

function connectSocket(token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, { auth: { token } });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (error: Error) => reject(error));
  });
}

function waitFor<T>(socket: ClientSocket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${event}"`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function main() {
  console.log("== E2E chat delivery test ==");

  // Two fresh users = two "browsers".
  const suffix = Date.now();
  const a = (await api("/auth/register", "POST", {
    name: `E2E A ${suffix}`,
    email: `e2e-a-${suffix}@test.local`,
    password: "password123",
  })) as Session;
  const b = (await api("/auth/register", "POST", {
    name: `E2E B ${suffix}`,
    email: `e2e-b-${suffix}@test.local`,
    password: "password123",
  })) as Session;
  console.log(`registered users:\n  A=${a.user.name} (${a.user.id})\n  B=${b.user.name} (${b.user.id})`);

  // Both connect their sockets (like opening the app in two browsers).
  const socketA = await connectSocket(a.token);
  const socketB = await connectSocket(b.token);
  console.log("both sockets connected");

  // A starts a conversation with B.
  const { conversation } = (await api("/chat/conversations", "POST", { memberId: b.user.id }, a.token)) as {
    conversation: { _id: string };
  };
  const conversationId = String(conversation._id);
  console.log(`conversation created: ${conversationId}`);

  // Both join the conversation room (the client does this when the conversation is selected).
  socketA.emit("conversation:join", conversationId);
  socketB.emit("conversation:join", conversationId);
  await new Promise((resolve) => setTimeout(resolve, 300));

  // B listens for incoming messages (like the ChatWorkspace socket.on("chat:message")).
  const receivedPromise = waitFor<any>(socketB, "chat:message");

  // A sends the message over the socket (like MessageComposer -> sendMessage).
  console.log("A is sending message over socket...");
  const sendResult = await new Promise<any>((resolve) => {
    socketA.emit("chat:message", { conversationId, text: "Hello B!" }, (result: any) => resolve(result));
    setTimeout(() => resolve({ ok: false, note: "no ack callback received" }), 3000);
  });
  console.log("send ack:", JSON.stringify(sendResult));

  try {
    const received = await receivedPromise;
    console.log(`SUCCESS: B received message: ${JSON.stringify(received)}`);
  } catch (error) {
    console.error(`FAIL: B never received "chat:message" within 5s (${(error as Error).message})`);

    // Diagnostics: can B see the message via REST?
    const rest = (await api(`/chat/conversations/${conversationId}/messages`, "GET", undefined, b.token)) as {
      messages: { _id: string; text?: string }[];
    };
    console.log(`diagnostic: REST messages visible to B: ${rest.messages.length} (${rest.messages.map((m) => m.text).join(" | ")})`);
  }

  socketA.disconnect();
  socketB.disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error("E2E test crashed:", error);
  process.exit(1);
});
