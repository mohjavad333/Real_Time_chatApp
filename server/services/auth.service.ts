import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { User } from "../models/User";

const credentialsSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export type AuthCredentials = z.infer<typeof credentialsSchema>;

function getJwtSecret() {
  if (!env.jwtSecret) throw new Error("JWT_SECRET is not configured");
  return env.jwtSecret;
}

function createToken(userId: string) {
  return jwt.sign({ sub: userId }, getJwtSecret(), { expiresIn: "7d" });
}

function toPublicUser(user: { id?: string; _id?: { toString: () => string }; name: string; email: string; avatarUrl?: string }) {
  return { id: user.id ?? user._id!.toString(), name: user.name, email: user.email, avatarUrl: user.avatarUrl };
}

export async function registerUser(input: unknown) {
  const credentials = credentialsSchema.extend({ name: z.string().trim().min(2).max(80) }).parse(input);
  const existingUser = await User.findOne({ email: credentials.email }).lean();
  if (existingUser) {
    const error = new Error("An account with this email already exists");
    (error as Error & { statusCode?: number }).statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(credentials.password, 12);
  const user = await User.create({ name: credentials.name, email: credentials.email, passwordHash });
  return { user: toPublicUser(user), token: createToken(user.id) };
}

export async function loginUser(input: unknown) {
  const credentials = credentialsSchema.omit({ name: true }).parse(input);
  const user = await User.findOne({ email: credentials.email }).select("+passwordHash");
  const validPassword = user ? await bcrypt.compare(credentials.password, user.passwordHash) : false;
  if (!user || !validPassword) {
    const error = new Error("Invalid email or password");
    (error as Error & { statusCode?: number }).statusCode = 401;
    throw error;
  }

  return { user: toPublicUser(user), token: createToken(user.id) };
}

export async function getUserById(userId: string) {
  const user = await User.findById(userId).lean();
  return user ? toPublicUser(user) : null;
}

export function verifyToken(token: string) {
  const payload = jwt.verify(token, getJwtSecret());
  if (typeof payload === "string" || !payload.sub) throw new Error("Invalid token");
  return payload.sub;
}
