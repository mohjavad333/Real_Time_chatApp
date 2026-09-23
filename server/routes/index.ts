import { Router } from "express";
import { getHealth } from "../controllers/health.controller";
import { authRouter } from "./auth";
import { chatRouter } from "./chat";
import { handleDemo } from "./demo";
import { mediaRouter } from "./media";
import { usersRouter } from "./users";

export const apiRouter = Router();

apiRouter.get("/health", getHealth);
apiRouter.get("/demo", handleDemo);
apiRouter.use("/auth", authRouter);
apiRouter.use("/chat", chatRouter);
apiRouter.use("/media", mediaRouter);
apiRouter.use("/users", usersRouter);
