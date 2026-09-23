import path from "node:path";
import { createServer as createHttpServer } from "node:http";
import express from "express";
import { Server } from "socket.io";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import { createServer } from "./index";
import { registerSocketHandlers } from "./socket";

const app = createServer();
const httpServer = createHttpServer(app);
const io = new Server(httpServer, { cors: { origin: env.clientOrigin } });
const distPath = path.join(import.meta.dirname, "../spa");

registerSocketHandlers(io);
app.use(express.static(distPath));
// Express 5 uses path-to-regexp v8: a bare "*" wildcard is invalid there,
// so the SPA fallback is registered as a catch-all route instead.
app.get("/{*splat}", (req, res) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return res.status(404).json({ message: "API endpoint not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});

connectDatabase()
  .then(() => {
    httpServer.listen(env.port, () => {
      console.log(`Loop server listening on port ${env.port}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed", error);
    process.exit(1);
  });

const shutdown = async () => {
  await io.close();
  httpServer.close();
  process.exitCode = 0;
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
