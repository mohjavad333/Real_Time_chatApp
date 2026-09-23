import { model, Schema } from "mongoose";

export interface UserDocument {
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    avatarUrl: { type: String, trim: true },
    lastSeenAt: { type: Date },
  },
  { timestamps: true },
);

export const User = model<UserDocument>("User", userSchema);
