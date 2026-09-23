import { Router } from "express";
import { archiveConversation, getConversationMedia, getConversations, getMessages, postConversation, postMessage, readConversation, searchConversationMessages } from "../controllers/chat.controller";
import { requireAuth } from "../middleware/auth";

export const chatRouter = Router();
chatRouter.use(requireAuth);

chatRouter.get("/conversations", getConversations);
chatRouter.patch("/conversations/:conversationId/archive", archiveConversation);
chatRouter.post("/conversations", postConversation);
chatRouter.get("/conversations/:conversationId/messages", getMessages);
chatRouter.post("/conversations/:conversationId/messages", postMessage);
chatRouter.get("/conversations/:conversationId/messages/search", searchConversationMessages);
chatRouter.get("/conversations/:conversationId/media", getConversationMedia);
chatRouter.patch("/conversations/:conversationId/read", readConversation);
