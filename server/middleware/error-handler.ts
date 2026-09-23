import type { ErrorRequestHandler } from "express";
import { z } from "zod";

export const notFoundHandler = (req: any, res: any) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof z.ZodError ? 400 : (error.statusCode ?? 500);
  res.status(statusCode).json({
    message: statusCode === 500 ? "Internal server error" : error.message,
    ...(error instanceof z.ZodError ? { issues: error.issues } : {}),
  });
};
