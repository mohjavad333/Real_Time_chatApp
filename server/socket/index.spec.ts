import { EventEmitter } from "node:events";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { env } from "../config/env";
import { createMessage, markConversationRead } from "../services/chat.service";
import { registerSocketHandlers } from "./index";
import { socketEvents } from "./events";

vi.mock("../services/chat.service", () => ({
  createMessage: vi.fn(),
  markConversationRead: vi.fn(),
}));

const USER_ID = "64b000000000000000000001";
const OTHER_ID = "64b000000000000000000002";
const CONVERSATION_ID = "64b000000000000000000003";
const ROOM = `conversation:${CONVERSATION_ID}`;

function makeToken(userId: string) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: "1m" });
}

type FakeSocket = ReturnType<ReturnType<typeof createHarness>['connect']>;

/**
 * Minimal Socket.IO fakes matching the semantics registerSocketHandlers relies on:
 * - `socket.emit` records server -> client deliveries (assert with toHaveBeenCalledWith).
 * - Client -> server events are simulated by emitting on the socket (handlers
 *   were registered on it by the connection callback).
 * - `io.to(room).emit` reaches every member INCLUDING the sender;
 *   `socket.to(room).emit` / `broadcast.emit` exclude the sender.
 */
function createHarness() {
  const sockets: FakeSocket[] = [];

  class FakeSocket extends EventEmitter {
    id: string;
    userId = "";
    data: Record<string, unknown> = {};
    handshake: { auth: Record<string, unknown> };
    joinedRooms = new Set<string>();
    emit = vi.fn();
    join = vi.fn((room: string) => this.joinedRooms.add(room));
    leave = vi.fn((room: string) => this.joinedRooms.delete(room));

    constructor(auth: Record<string, unknown>) {
      super();
      this.id = `socket-${sockets.length}`;
      this.handshake = { auth };
    }

    to(room: string) {
      return {
        emit: (event: string, payload: unknown) => {
          for (const socket of sockets) {
            if (socket !== this && socket.joinedRooms.has(room)) socket.emit(event, payload);
          }
        },
      };
    }

    broadcast = {
      emit: (event: string, payload: unknown) => {
        for (const socket of sockets) {
          if (socket !== this) socket.emit(event, payload);
        }
      },
    };
  }

  function emitToRoom(room: string) {
    return {
      emit: (event: string, payload: unknown) => {
        for (const socket of sockets) {
          if (socket.joinedRooms.has(room)) socket.emit(event, payload);
        }
      },
    };
  }

  const io = {
    use: vi.fn(),
    on: vi.fn(),
    to: emitToRoom,
  };

  function connect(userId: string, room?: string): FakeSocket {
    const socket = new FakeSocket({ token: makeToken(userId) });
    sockets.push(socket);
    const middleware = io.use.mock.calls[0][0];
    const next = vi.fn((error?: unknown) => {
      if (error) throw error;
    });
    middleware(socket, next);
    socket.userId = userId;
    io.on.mock.calls[0][1](socket);
    if (room) socket.join(room);
    return socket;
  }

  function clientEmits(socket: FakeSocket, event: string, payload: unknown, callback?: (result: unknown) => void) {
    // Client -> server delivery: dispatch to the handlers registered on the
    // socket, bypassing the recorded server -> client emit.
    EventEmitter.prototype.emit.call(socket, event, payload, callback);
  }

  // The server tracks online users in module-level state; disconnect everyone
  // after each test so tests stay isolated.
  onTestFinished(() => {
    for (const socket of sockets) {
      EventEmitter.prototype.emit.call(socket, "disconnect");
    }
  });

  return { io, sockets, connect, clientEmits };
}

const messageDoc = () => ({
  _id: "m1",
  conversationId: CONVERSATION_ID,
  senderId: USER_ID,
  text: "hello",
  imageUrl: undefined,
  readBy: [USER_ID],
  toObject: () => ({ _id: "m1", conversationId: CONVERSATION_ID, senderId: USER_ID, text: "hello", imageUrl: undefined, readBy: [USER_ID] }),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createMessage).mockResolvedValue(messageDoc() as any);
  vi.mocked(markConversationRead).mockResolvedValue({ success: true } as any);
});

describe("socket authentication middleware", () => {
  it("rejects connections without a token", () => {
    const { io } = createHarness();
    registerSocketHandlers(io as any);
    const next = vi.fn();
    io.use.mock.calls[0][0]({ handshake: { auth: {} } }, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Authentication required" }));
  });

  it("rejects invalid tokens", () => {
    const { io } = createHarness();
    registerSocketHandlers(io as any);
    const next = vi.fn();
    io.use.mock.calls[0][0]({ handshake: { auth: { token: "not-a-jwt" } } }, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Invalid or expired token" }));
  });

  it("accepts valid tokens and attaches the userId", () => {
    const { io } = createHarness();
    registerSocketHandlers(io as any);
    const socket: any = { handshake: { auth: { token: makeToken(USER_ID) } }, userId: "" };
    const next = vi.fn();
    io.use.mock.calls[0][0](socket, next);
    expect(next).toHaveBeenCalledWith();
    expect(socket.userId).toBe(USER_ID);
  });
});

describe("connection and presence", () => {
  it("sends a presence snapshot to the connecting socket and announces it to others", () => {
    const harness = createHarness();
    registerSocketHandlers(harness.io as any);

    const alice = harness.connect(USER_ID);
    expect(alice.emit).toHaveBeenCalledWith(socketEvents.presenceSnapshot, { onlineUserIds: [USER_ID] });

    const bob = harness.connect(OTHER_ID);
    expect(bob.emit).toHaveBeenCalledWith(socketEvents.presenceSnapshot, { onlineUserIds: [USER_ID, OTHER_ID] });
    expect(alice.emit).toHaveBeenCalledWith(socketEvents.presenceChanged, { userId: OTHER_ID, online: true });
  });

  it("announces offline to others on disconnect", () => {
    const harness = createHarness();
    registerSocketHandlers(harness.io as any);
    const alice = harness.connect(USER_ID);
    const bob = harness.connect(OTHER_ID);
    alice.emit.mockClear();
    bob.emit.mockClear();

    harness.clientEmits(alice, "disconnect", undefined);

    expect(bob.emit).toHaveBeenCalledWith(socketEvents.presenceChanged, { userId: USER_ID, online: false });
  });
});

describe("conversation rooms", () => {
  it("joins and leaves rooms on request", () => {
    const harness = createHarness();
    registerSocketHandlers(harness.io as any);
    const alice = harness.connect(USER_ID);

    harness.clientEmits(alice, "conversation:join", CONVERSATION_ID);
    expect(alice.join).toHaveBeenCalledWith(ROOM);

    harness.clientEmits(alice, "conversation:leave", CONVERSATION_ID);
    expect(alice.leave).toHaveBeenCalledWith(ROOM);
  });
});

describe("chat:message", () => {
  it("persists the message and broadcasts it to room members including the sender echo", async () => {
    const harness = createHarness();
    registerSocketHandlers(harness.io as any);
    const alice = harness.connect(USER_ID, ROOM);
    const bob = harness.connect(OTHER_ID, ROOM);
    alice.emit.mockClear();
    bob.emit.mockClear();

    const callback = vi.fn();
    harness.clientEmits(alice, socketEvents.chatMessage, { conversationId: CONVERSATION_ID, text: "hello" }, callback);
    await vi.waitFor(() => expect(callback).toHaveBeenCalled());

    expect(createMessage).toHaveBeenCalledWith(USER_ID, CONVERSATION_ID, { text: "hello", imageUrl: undefined });
    expect(callback).toHaveBeenCalledWith({ ok: true, message: expect.objectContaining({ _id: "m1", text: "hello" }) });
    expect(bob.emit).toHaveBeenCalledWith(socketEvents.chatMessage, expect.objectContaining({ _id: "m1", text: "hello" }));
    expect(alice.emit).toHaveBeenCalledWith(socketEvents.chatMessage, expect.objectContaining({ _id: "m1", text: "hello" }));
  });

  it("reports failures through the callback without broadcasting", async () => {
    vi.mocked(createMessage).mockRejectedValueOnce(new Error("Conversation not found"));
    const harness = createHarness();
    registerSocketHandlers(harness.io as any);
    const alice = harness.connect(USER_ID, ROOM);
    const bob = harness.connect(OTHER_ID, ROOM);
    alice.emit.mockClear();
    bob.emit.mockClear();

    const callback = vi.fn();
    harness.clientEmits(alice, socketEvents.chatMessage, { conversationId: CONVERSATION_ID, text: "hello" }, callback);
    await vi.waitFor(() => expect(callback).toHaveBeenCalled());

    expect(callback).toHaveBeenCalledWith({ ok: false, message: "Conversation not found" });
    expect(bob.emit).not.toHaveBeenCalledWith(socketEvents.chatMessage, expect.anything());
  });
});

describe("chat:typing", () => {
  it("relays typing state to other room members but not the sender", () => {
    const harness = createHarness();
    registerSocketHandlers(harness.io as any);
    const alice = harness.connect(USER_ID, ROOM);
    const bob = harness.connect(OTHER_ID, ROOM);
    alice.emit.mockClear();
    bob.emit.mockClear();

    harness.clientEmits(alice, socketEvents.chatTyping, { conversationId: CONVERSATION_ID, isTyping: true });

    expect(bob.emit).toHaveBeenCalledWith(socketEvents.chatTyping, { conversationId: CONVERSATION_ID, isTyping: true, userId: USER_ID });
    expect(alice.emit).not.toHaveBeenCalledWith(socketEvents.chatTyping, expect.anything());
  });
});

describe("chat:read", () => {
  it("marks the conversation read and relays the receipt to other members", async () => {
    const harness = createHarness();
    registerSocketHandlers(harness.io as any);
    const alice = harness.connect(USER_ID, ROOM);
    const bob = harness.connect(OTHER_ID, ROOM);
    alice.emit.mockClear();
    bob.emit.mockClear();

    harness.clientEmits(alice, socketEvents.chatRead, { conversationId: CONVERSATION_ID });
    await vi.waitFor(() => expect(markConversationRead).toHaveBeenCalledWith(USER_ID, CONVERSATION_ID));

    expect(bob.emit).toHaveBeenCalledWith(socketEvents.chatRead, { conversationId: CONVERSATION_ID, userId: USER_ID });
    expect(alice.emit).not.toHaveBeenCalledWith(socketEvents.chatRead, expect.anything());
  });

  it("emits a chat:error to the sender when marking read fails", async () => {
    vi.mocked(markConversationRead).mockRejectedValueOnce(new Error("Conversation not found"));
    const harness = createHarness();
    registerSocketHandlers(harness.io as any);
    const alice = harness.connect(USER_ID, ROOM);

    harness.clientEmits(alice, socketEvents.chatRead, { conversationId: CONVERSATION_ID });
    await vi.waitFor(() => expect(alice.emit).toHaveBeenCalledWith("chat:error", { message: "Unable to mark conversation as read" }));
  });
});
