import { Router } from "express";
import { getUserSearch } from "../controllers/user.controller";
import { requireAuth } from "../middleware/auth";

export const usersRouter = Router();
usersRouter.use(requireAuth);
usersRouter.get("/search", getUserSearch);
