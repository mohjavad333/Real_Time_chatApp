import type { RequestHandler } from "express";
import { searchUsers } from "../services/user.service";

export const getUserSearch: RequestHandler = async (req, res, next) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    res.json({ users: await searchUsers(req.userId!, query) });
  } catch (error) {
    next(error);
  }
};
