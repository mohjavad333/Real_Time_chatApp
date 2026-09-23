import mongoose from "mongoose";
import { env } from "./env";

let connectionPromise: Promise<typeof mongoose> | null = null;

export function connectDatabase() {
  if (!env.mongoUri) return Promise.resolve(null);
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
  }
  return connectionPromise;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  connectionPromise = null;
}
