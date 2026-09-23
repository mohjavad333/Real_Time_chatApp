import { z } from "zod";
import { Conversation } from "../models/Conversation";
import { Message } from "../models/Message";
import { Types } from "mongoose";

const objectIdSchema = z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid id");
const createConversationSchema = z.object({ memberId: objectIdSchema });
const createMessageSchema = z.object({
  text: z.string().trim().max(5000).optional(),
  imageUrl: z.string().url().optional(),
}).refine((value) => value.text || value.imageUrl, "A message must contain text or an image");

function requireObjectId(value: string) {
  return new Types.ObjectId(objectIdSchema.parse(value));
}

function httpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function serializeMessage(message: any) {
  return {
    ...message,
    _id: message._id.toString(),
    conversationId: message.conversationId.toString(),
    senderId: message.senderId.toString(),
    readBy: message.readBy.map((userId: any) => userId.toString()),
  };
}

export async function listConversations(userId: string, options: { archived?: boolean } = {}) {
  const userObjectId = requireObjectId(userId);
  // Archive is per-user: `$ne` filters the list for the member who archived it,
  // while the other member keeps seeing the conversation normally.
  const archiveFilter = options.archived ? userObjectId : { $ne: userObjectId };
  const conversations = await Conversation.find({ memberIds: userObjectId, archivedFor: archiveFilter })
    .sort({ updatedAt: -1 })
    .populate("memberIds", "name email avatarUrl lastSeenAt")
    .populate("lastMessageId")
    .lean();

  const conversationIds = conversations.map((conversation) => conversation._id);
  const unreadCounts = await Message.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { conversationId: { $in: conversationIds }, readBy: { $ne: userObjectId }, senderId: { $ne: userObjectId } } },
    { $group: { _id: "$conversationId", count: { $sum: 1 } } },
  ]);
  const unreadByConversation = new Map(unreadCounts.map((row) => [String(row._id), row.count]));

  return conversations.map((conversation) => ({
    ...conversation,
    unreadCount: unreadByConversation.get(String(conversation._id)) ?? 0,
  }));
}

export async function createConversation(userId: string, input: unknown) {
  const { memberId } = createConversationSchema.parse(input);
  if (memberId === userId) throw httpError("You cannot start a conversation with yourself", 400);

  const userObjectId = requireObjectId(userId);
  const memberObjectId = requireObjectId(memberId);
  const existing = await Conversation.findOne({ memberIds: { $all: [userObjectId, memberObjectId] } });
  if (existing) return existing.populate("memberIds", "name email avatarUrl lastSeenAt");

  const conversation = await Conversation.create({ memberIds: [userObjectId, memberObjectId] });
  return conversation.populate("memberIds", "name email avatarUrl lastSeenAt");
}

export async function listMessages(userId: string, conversationId: string, page = 1, limit = 30) {
  const userObjectId = requireObjectId(userId);
  const conversationObjectId = requireObjectId(conversationId);
  const conversation = await Conversation.exists({ _id: conversationObjectId, memberIds: userObjectId });
  if (!conversation) throw httpError("Conversation not found", 404);

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const [messages, total] = await Promise.all([
    Message.find({ conversationId: conversationObjectId }).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    Message.countDocuments({ conversationId: conversationObjectId }),
  ]);
  return { messages: messages.reverse().map(serializeMessage), pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) } };
}

export async function listConversationMedia(userId: string, conversationId: string, limit = 30) {
  const userObjectId = requireObjectId(userId);
  const conversationObjectId = requireObjectId(conversationId);
  const conversation = await Conversation.exists({ _id: conversationObjectId, memberIds: userObjectId });
  if (!conversation) throw httpError("Conversation not found", 404);

  const safeLimit = Math.min(60, Math.max(1, limit));
  return Message.find({ conversationId: conversationObjectId, imageUrl: { $exists: true, $ne: null } })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .select("imageUrl createdAt")
    .lean();
}

export async function createMessage(userId: string, conversationId: string, input: unknown) {
  const { text, imageUrl } = createMessageSchema.parse(input);
  const userObjectId = requireObjectId(userId);
  const conversationObjectId = requireObjectId(conversationId);
  const conversation = await Conversation.findOne({ _id: conversationObjectId, memberIds: userObjectId });
  if (!conversation) throw httpError("Conversation not found", 404);

  const message = await Message.create({ conversationId: conversationObjectId, senderId: userObjectId, text, imageUrl, readBy: [userObjectId] });
  conversation.lastMessageId = message._id;
  await conversation.save();
  return message;
}

export async function searchMessages(userId: string, conversationId: string, query: string) {
  const userObjectId = requireObjectId(userId);
  const conversationObjectId = requireObjectId(conversationId);
  const conversation = await Conversation.exists({ _id: conversationObjectId, memberIds: userObjectId });
  if (!conversation) throw httpError("Conversation not found", 404);
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];
  return Message.find({ conversationId: conversationObjectId, text: { $regex: normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
}

export async function setConversationArchived(userId: string, conversationId: string, archived: boolean) {
  const userObjectId = requireObjectId(userId);
  const conversationObjectId = requireObjectId(conversationId);
  const conversation = await Conversation.exists({ _id: conversationObjectId, memberIds: userObjectId });
  if (!conversation) throw httpError("Conversation not found", 404);
  await Conversation.updateOne(
    { _id: conversationObjectId },
    archived ? { $addToSet: { archivedFor: userObjectId } } : { $pull: { archivedFor: userObjectId } },
  );
  return { success: true, archived };
}

export async function markConversationRead(userId: string, conversationId: string) {
  const userObjectId = requireObjectId(userId);
  const conversationObjectId = requireObjectId(conversationId);
  const conversation = await Conversation.exists({ _id: conversationObjectId, memberIds: userObjectId });
  if (!conversation) throw httpError("Conversation not found", 404);
  await Message.updateMany({ conversationId: conversationObjectId, readBy: { $ne: userObjectId } }, { $addToSet: { readBy: userObjectId } });
  return { success: true };
}
