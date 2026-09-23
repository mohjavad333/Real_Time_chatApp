import { model, Schema, Types } from "mongoose";

export interface ConversationDocument {
  memberIds: Types.ObjectId[];
  lastMessageId?: Types.ObjectId;
  /** Per-member archive flag: a user who archived the conversation no longer sees it in the main list. */
  archivedFor: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<ConversationDocument>(
  {
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessageId: { type: Schema.Types.ObjectId, ref: "Message" },
    archivedFor: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
  },
  { timestamps: true },
);

conversationSchema.index({ memberIds: 1, updatedAt: -1 });

export const Conversation = model<ConversationDocument>("Conversation", conversationSchema);
