import type { RequestHandler } from "express";
import { createConversation, createMessage, listConversationMedia, listConversations, listMessages, markConversationRead, searchMessages, setConversationArchived } from "../services/chat.service";

export const getConversations: RequestHandler = async (req, res, next) => {
  try {
    const archived = req.query.archived === "true" ? { archived: true } : {};
    res.json({ conversations: await listConversations(req.userId!, archived) });
  } catch (error) { next(error); }
};

export const postConversation: RequestHandler = async (req, res, next) => {
  try { res.status(201).json({ conversation: await createConversation(req.userId!, req.body) }); } catch (error) { next(error); }
};

export const getMessages: RequestHandler = async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 30);
    res.json(await listMessages(req.userId!, String(req.params.conversationId), page, limit));
  } catch (error) { next(error); }
};

export const postMessage: RequestHandler = async (req, res, next) => {
  try { res.status(201).json({ message: await createMessage(req.userId!, String(req.params.conversationId), req.body) }); } catch (error) { next(error); }
};

export const searchConversationMessages: RequestHandler = async (req, res, next) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    res.json({ messages: await searchMessages(req.userId!, String(req.params.conversationId), query) });
  } catch (error) { next(error); }
};

export const getConversationMedia: RequestHandler = async (req, res, next) => {
  try { res.json({ media: await listConversationMedia(req.userId!, String(req.params.conversationId)) }); } catch (error) { next(error); }
};

export const readConversation: RequestHandler = async (req, res, next) => {
  try { res.json(await markConversationRead(req.userId!, String(req.params.conversationId))); } catch (error) { next(error); }
};

export const archiveConversation: RequestHandler = async (req, res, next) => {
  try {
    const archived = req.body?.archived !== false;
    res.json(await setConversationArchived(req.userId!, String(req.params.conversationId), archived));
  } catch (error) { next(error); }
};
