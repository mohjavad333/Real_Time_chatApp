import { Router } from "express";
import { uploadChatImage } from "../controllers/media.controller";
import { requireAuth } from "../middleware/auth";
import { imageUpload } from "../middleware/upload";

export const mediaRouter = Router();
mediaRouter.use(requireAuth);
mediaRouter.post("/images", imageUpload.single("image"), uploadChatImage);
