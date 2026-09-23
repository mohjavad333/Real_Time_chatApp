import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { Server } from "socket.io";
import { createServer } from "./server";
import { connectDatabase } from "./server/config/database";
import { env } from "./server/config/env";
import { registerSocketHandlers } from "./server/socket";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared", "index.html"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      // Dev mode: serve without CSP so Vite's injected inline scripts are allowed.
      const app = createServer({ disableContentSecurityPolicy: true });
      if (!process.env.VITEST) {
        connectDatabase().catch((error) => {
          console.error("MongoDB connection failed in development", error);
        });
      }

      // Add Express app and Socket.io to Vite dev server
      server.middlewares.use(app);
      if (server.httpServer && !process.env.VITEST) {
        const io = new Server(server.httpServer, { cors: { origin: env.clientOrigin } });
        registerSocketHandlers(io);
        server.httpServer.once("close", () => io.close());
      }
    },
  };
}
