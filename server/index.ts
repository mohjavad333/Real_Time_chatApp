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
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false, handler: (_req, res) => { res.status(429).json({ message: "Too many authentication attempts. Please try again later." }); } }));
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
