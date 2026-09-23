import type { RequestHandler } from "express";
import { getUserById, loginUser, registerUser } from "../services/auth.service";

export const register: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await registerUser(req.body));
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    res.status(200).json(await loginUser(req.body));
  } catch (error) {
    next(error);
  }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    const user = await getUserById(req.userId!);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};
