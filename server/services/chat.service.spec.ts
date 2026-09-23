import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createConversation,
  createMessage,
  listConversationMedia,
  listConversations,
  listMessages,
  markConversationRead,
  searchMessages,
  setConversationArchived,
} from "./chat.service";

const USER_ID = "64b000000000000000000001";
const OTHER_ID = "64b000000000000000000002";
const CONVERSATION_ID = "64b000000000000000000003";
const MESSAGE_ID = "64b000000000000000000004";
const MESSAGE_ID_2 = "64b000000000000000000005";

const userObjectId = new Types.ObjectId(USER_ID);
const otherObjectId = new Types.ObjectId(OTHER_ID);
const conversationObjectId = new Types.ObjectId(CONVERSATION_ID);
const messageObjectId = new Types.ObjectId(MESSAGE_ID);
const messageObjectId2 = new Types.ObjectId(MESSAGE_ID_2);

const h = vi.hoisted(() => {
  // Chainable query stub: every chain method returns the query itself; `lean`
  // (and direct await, via `then`) resolve with the given value.
  const chainable = (value: unknown) => {
    const query: Record<string, any> = {};
    for (const method of ["sort", "populate", "skip", "limit", "select"]) {
      query[method] = vi.fn(() => query);
    }
    query.lean = vi.fn(() => Promise.resolve(value));
    query.then = (onFulfilled: any, onRejected: any) => Promise.resolve(value).then(onFulfilled, onRejected);
    return query;
  };
  return {
    chainable,
    conversationFind: vi.fn(),
    conversationFindOne: vi.fn(),
    conversationCreate: vi.fn(),
    conversationExists: vi.fn(),
    conversationUpdateOne: vi.fn(),
    messageFind: vi.fn(),
    messageCreate: vi.fn(),
    messageCountDocuments: vi.fn(),
    messageUpdateMany: vi.fn(),
    messageAggregate: vi.fn(),
  };
});

vi.mock("../models/Conversation", () => ({
  Conversation: {
    find: h.conversationFind,
    findOne: h.conversationFindOne,
    create: h.conversationCreate,
    exists: h.conversationExists,
    updateOne: h.conversationUpdateOne,
  },
}));

vi.mock("../models/Message", () => ({
  Message: {
    find: h.messageFind,
    create: h.messageCreate,
    countDocuments: h.messageCountDocuments,
    updateMany: h.messageUpdateMany,
    aggregate: h.messageAggregate,
  },
}));

function httpErrorOf(promise: Promise<unknown>) {
  return promise.catch((error: Error & { statusCode?: number }) => ({ message: error.message, statusCode: error.statusCode })) as Promise<{ message: string; statusCode?: number }>;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.conversationFind.mockReturnValue(h.chainable([]));
  h.conversationFindOne.mockResolvedValue(null);
  h.conversationCreate.mockResolvedValue({ _id: conversationObjectId });
  h.conversationExists.mockResolvedValue({ _id: conversationObjectId });
  h.conversationUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  h.messageFind.mockReturnValue(h.chainable([]));
  h.messageCreate.mockResolvedValue({ _id: messageObjectId });
  h.messageCountDocuments.mockResolvedValue(0);
  h.messageUpdateMany.mockResolvedValue({ modifiedCount: 0 });
  h.messageAggregate.mockResolvedValue([]);
});

describe("listConversations", () => {
  it("returns conversations with computed unread counts", async () => {
    h.conversationFind.mockReturnValue(h.chainable([{ _id: conversationObjectId, memberIds: [userObjectId] }]));
    h.messageAggregate.mockResolvedValue([{ _id: conversationObjectId, count: 3 }]);

    const result = await listConversations(USER_ID);

    expect(result).toEqual([{ _id: conversationObjectId, memberIds: [userObjectId], unreadCount: 3 }]);
    const [pipeline] = h.messageAggregate.mock.calls[0];
    expect(pipeline[0].$match).toEqual({ conversationId: { $in: [conversationObjectId] }, readBy: { $ne: userObjectId }, senderId: { $ne: userObjectId } });
  });

  it("defaults unreadCount to zero when there are no unread messages", async () => {
    h.conversationFind.mockReturnValue(h.chainable([{ _id: conversationObjectId, memberIds: [] }]));

    const result = await listConversations(USER_ID);

    expect(result[0].unreadCount).toBe(0);
  });
});

describe("createConversation", () => {
  it("rejects conversation with yourself", async () => {
    const error = await httpErrorOf(createConversation(USER_ID, { memberId: USER_ID }));
    expect(error).toMatchObject({ statusCode: 400 });
  });

  it("returns the existing conversation instead of duplicating", async () => {
    const existing = { _id: conversationObjectId, memberIds: [userObjectId], populate: () => Promise.resolve({ _id: conversationObjectId }) };
    h.conversationFindOne.mockResolvedValue(existing);

    const result = await createConversation(USER_ID, { memberId: OTHER_ID });

    expect(h.conversationCreate).not.toHaveBeenCalled();
    expect(result).toEqual({ _id: conversationObjectId });
    expect(h.conversationFindOne).toHaveBeenCalledWith({ memberIds: { $all: [userObjectId, otherObjectId] } });
  });

  it("creates a conversation for two members", async () => {
    const created = { _id: conversationObjectId, populate: () => Promise.resolve({ _id: conversationObjectId, memberIds: [userObjectId, otherObjectId] }) };
    h.conversationCreate.mockResolvedValue(created);

    const result = await createConversation(USER_ID, { memberId: OTHER_ID });

    expect(h.conversationCreate).toHaveBeenCalledWith({ memberIds: [userObjectId, otherObjectId] });
    expect(result).toEqual({ _id: conversationObjectId, memberIds: [userObjectId, otherObjectId] });
  });

  it("rejects invalid member ids", async () => {
    const error = await httpErrorOf(createConversation(USER_ID, { memberId: "not-an-id" }));
    expect(error.message).toContain("Invalid id");
  });
});

describe("listMessages", () => {
  it("throws 404 for conversations the user is not a member of", async () => {
    h.conversationExists.mockResolvedValue(null);
    const error = await httpErrorOf(listMessages(USER_ID, CONVERSATION_ID));
    expect(error).toMatchObject({ statusCode: 404 });
  });

  it("paginates newest-first queries and returns them in chronological order", async () => {
    h.messageFind.mockReturnValue(h.chainable([
      { _id: messageObjectId2, conversationId: conversationObjectId, senderId: otherObjectId, readBy: [] },
      { _id: messageObjectId, conversationId: conversationObjectId, senderId: otherObjectId, readBy: [] },
    ]));
    h.messageCountDocuments.mockResolvedValue(2);

    const result = await listMessages(USER_ID, CONVERSATION_ID, 2, 30);

    // The service sorts newest-first in the query, then reverses for chronological order.
    expect(result.messages.map((message) => message._id)).toEqual([MESSAGE_ID, MESSAGE_ID_2]);
    expect(result.pagination).toEqual({ page: 2, limit: 30, total: 2, pages: 1 });
    const query = h.messageFind.mock.results[0].value;
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(query.skip).toHaveBeenCalledWith(30);
    expect(query.limit).toHaveBeenCalledWith(30);
  });

  it("clamps non-sensical pagination inputs", async () => {
    h.messageCountDocuments.mockResolvedValue(0);
    const result = await listMessages(USER_ID, CONVERSATION_ID, -5, 5000);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(100);
  });
});

describe("createMessage", () => {
  it("throws 404 when the conversation is not found for the user", async () => {
    h.conversationFindOne.mockResolvedValue(null);
    const error = await httpErrorOf(createMessage(USER_ID, CONVERSATION_ID, { text: "hi" }));
    expect(error).toMatchObject({ statusCode: 404 });
  });

  it("rejects messages without text or image", async () => {
    h.conversationFindOne.mockResolvedValue({ _id: conversationObjectId, save: vi.fn() });
    const error = await httpErrorOf(createMessage(USER_ID, CONVERSATION_ID, {}));
    expect(error.message).toContain("A message must contain text or an image");
    expect(h.messageCreate).not.toHaveBeenCalled();
  });

  it("creates the message and moves the conversation pointer to it", async () => {
    const save = vi.fn(async () => undefined);
    const conversation: any = { _id: conversationObjectId, save };
    h.conversationFindOne.mockResolvedValue(conversation);
    h.messageCreate.mockResolvedValue({ _id: messageObjectId, toObject: () => ({ _id: messageObjectId }) });

    const message = await createMessage(USER_ID, CONVERSATION_ID, { text: "hello" });

    expect(h.messageCreate).toHaveBeenCalledWith({ conversationId: conversationObjectId, senderId: userObjectId, text: "hello", imageUrl: undefined, readBy: [userObjectId] });
    expect(conversation.lastMessageId).toEqual(messageObjectId);
    expect(save).toHaveBeenCalled();
    expect((message as any)._id).toEqual(messageObjectId);
  });
});

describe("searchMessages", () => {
  it("throws 404 for non-member conversations", async () => {
    h.conversationExists.mockResolvedValue(null);
    const error = await httpErrorOf(searchMessages(USER_ID, CONVERSATION_ID, "abc"));
    expect(error).toMatchObject({ statusCode: 404 });
  });

  it("returns empty for very short queries without querying", async () => {
    const result = await searchMessages(USER_ID, CONVERSATION_ID, "a");
    expect(result).toEqual([]);
    expect(h.messageFind).not.toHaveBeenCalled();
  });

  it("escapes regex special characters in the query", async () => {
    await searchMessages(USER_ID, CONVERSATION_ID, "a.c+d");

    const [filter] = h.messageFind.mock.calls[0];
    expect(filter.conversationId).toEqual(conversationObjectId);
    expect(filter.text.$regex).toBe("a\\.c\\+d");
    expect(filter.text.$options).toBe("i");
  });
});

describe("markConversationRead", () => {
  it("throws 404 for non-member conversations", async () => {
    h.conversationExists.mockResolvedValue(null);
    const error = await httpErrorOf(markConversationRead(USER_ID, CONVERSATION_ID));
    expect(error).toMatchObject({ statusCode: 404 });
  });

  it("adds the reader to readBy without touching existing readers", async () => {
    await markConversationRead(USER_ID, CONVERSATION_ID);
    expect(h.messageUpdateMany).toHaveBeenCalledWith(
      { conversationId: conversationObjectId, readBy: { $ne: userObjectId } },
      { $addToSet: { readBy: userObjectId } },
    );
  });
});

describe("listConversationMedia", () => {
  it("throws 404 for non-member conversations", async () => {
    h.conversationExists.mockResolvedValue(null);
    const error = await httpErrorOf(listConversationMedia(USER_ID, CONVERSATION_ID));
    expect(error).toMatchObject({ statusCode: 404 });
  });

  it("queries only image messages, newest first, capped at 60", async () => {
    const media = [{ _id: messageObjectId, imageUrl: "https://example.com/a.png", createdAt: new Date() }];
    h.messageFind.mockReturnValue(h.chainable(media));

    const result = await listConversationMedia(USER_ID, CONVERSATION_ID, 500);

    expect(result).toEqual(media);
    const [filter] = h.messageFind.mock.calls[0];
    expect(filter).toEqual({ conversationId: conversationObjectId, imageUrl: { $exists: true, $ne: null } });
    const query = h.messageFind.mock.results[0].value;
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(query.limit).toHaveBeenCalledWith(60);
    expect(query.select).toHaveBeenCalledWith("imageUrl createdAt");
  });
});

describe("archive", () => {
  describe("listConversations", () => {
    it("excludes archived conversations from the default list", async () => {
      h.conversationFind.mockReturnValue(h.chainable([]));

      await listConversations(USER_ID);

      const [filter] = h.conversationFind.mock.calls[0];
      expect(filter.memberIds).toEqual(userObjectId);
      expect(filter.archivedFor).toEqual({ $ne: userObjectId });
    });

    it("returns only archived conversations when requested", async () => {
      h.conversationFind.mockReturnValue(h.chainable([]));

      await listConversations(USER_ID, { archived: true });

      const [filter] = h.conversationFind.mock.calls[0];
      expect(filter.archivedFor).toEqual(userObjectId);
    });
  });

  describe("setConversationArchived", () => {
    it("throws 404 for non-member conversations", async () => {
      h.conversationExists.mockResolvedValue(null);
      const error = await httpErrorOf(setConversationArchived(USER_ID, CONVERSATION_ID, true));
      expect(error).toMatchObject({ statusCode: 404 });
    });

    it("adds the member to archivedFor when archiving", async () => {
      await setConversationArchived(USER_ID, CONVERSATION_ID, true);
      expect(h.conversationUpdateOne).toHaveBeenCalledWith(
        { _id: conversationObjectId },
        { $addToSet: { archivedFor: userObjectId } },
      );
    });

    it("removes the member from archivedFor when unarchiving", async () => {
      await setConversationArchived(USER_ID, CONVERSATION_ID, false);
      expect(h.conversationUpdateOne).toHaveBeenCalledWith(
        { _id: conversationObjectId },
        { $pull: { archivedFor: userObjectId } },
      );
    });
  });
});
