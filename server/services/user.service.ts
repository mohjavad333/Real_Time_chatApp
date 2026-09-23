import { User } from "../models/User";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function searchUsers(userId: string, query: string) {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];
  const expression = new RegExp(escapeRegex(normalizedQuery), "i");
  return User.find({ _id: { $ne: userId }, $or: [{ name: expression }, { email: expression }] })
    .select("name email avatarUrl lastSeenAt")
    .sort({ name: 1 })
    .limit(20)
    .lean();
}
