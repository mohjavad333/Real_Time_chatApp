import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { apiRouter } from "./routes";

export function createServer(
  // The Vite dev plugin passes { disableContentSecurityPolicy: true }: Vite injects
  // inline scripts (react-refresh preamble) into index.html that the CSP blocks,
  // which results in a blank page. NODE_ENV is not reliable for this decision
  // because it can be set to "production" in a developer's environment.
  options: { disableContentSecurityPolicy?: boolean } = {}
) {
  const app = express();

app.use(
  helmet({
    contentSecurityPolicy: options.disableContentSecurityPolicy ? false : undefined,
  })
);

  app.use(cors({ origin: env.clientOrigin }));
  // serverless-http v3 hands Express a fully buffered Body (a Buffer) instead
  // of a stream, so express.json skips parsing and every handler sees
  // req.body === Buffer. Parse buffered JSON/urlencoded bodies up-front; on a
  // normal HTTP server req.body is undefined here and nothing changes.
  app.use((req, _res, next) => {
    if (Buffer.isBuffer(req.body)) {
      const contentType = req.headers["content-type"] ?? "";
      const raw = req.body.toString("utf8");
      if (contentType.includes("application/json")) {
        try {
          req.body = JSON.parse(raw);
        } catch {
          req.body = {};
        }
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        req.body = Object.fromEntries(new URLSearchParams(raw));
      }
    }
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 30,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      // Serverless platforms (Netlify Functions) do not populate req.ip, which
      // makes express-rate-limit throw ERR_ERL_UNDEFINED_IP_ADDRESS and answer
      // 500. Fall back to the platform IP headers, then a shared bucket.
      keyGenerator: (req) => {
        const nfIp = req.headers["x-nf-client-connection-ip"];
        if (typeof nfIp === "string" && nfIp.trim()) return nfIp.split(",")[0].trim();
        const forwarded = req.headers["x-forwarded-for"];
        if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
        return req.ip ?? "unknown";
      },
      // The validation assumes a traditional HTTP server (req.ip always set).
      validate: false,
      handler: (_req, res) => {
        res.status(429).json({ message: "Too many authentication attempts. Please try again later." });
      },
    }),
  );
  app.use("/api", apiRouter);

  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      notFoundHandler(req, res);
      return;
    }
    next();
  });
  app.use(errorHandler);

  return app;
}
