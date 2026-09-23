import { model, Schema, Types } from "mongoose";

export interface MessageDocument {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  text?: string;
  imageUrl?: string;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<MessageDocument>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true, maxlength: 5000 },
    imageUrl: { type: String, trim: true },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
// Mongoose 9 removed the `next` callback from middleware: hooks are promise-based,
// so the validator must throw (or return a rejected promise) to abort the save.
messageSchema.pre("validate", function (this: MessageDocument) {
  if (!this.text && !this.imageUrl) {
    throw new Error("A message must contain text or an image");
  }
});

export const Message = model<MessageDocument>("Message", messageSchema);
