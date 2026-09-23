import type { RequestHandler } from "express";
import { uploadImage } from "../services/media.service";

export const uploadChatImage: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "An image file is required" });
      return;
    }
    const uploaded = await uploadImage(req.file.buffer);
    res.status(201).json({ imageUrl: uploaded.secureUrl, publicId: uploaded.publicId });
  } catch (error) {
    next(error);
  }
};
