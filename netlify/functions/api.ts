import serverless from "serverless-http";

import { connectDatabase } from "../../server/config/database";
import { createServer } from "../../server";

// Serverless functions are frozen between invocations, so the database
// connection must be established on every cold start. connectDatabase()
// caches its promise, so concurrent warm invocations reuse one connection.
const app = createServer();
const handler = serverless(app);

let initialized = false;

export default async (req: unknown, context: unknown) => {
  if (!initialized) {
    await connectDatabase().catch((error) => {
      console.error("MongoDB connection failed on cold start", error);
    });
    initialized = true;
  }
  return handler(req, context);
};

export { handler };
