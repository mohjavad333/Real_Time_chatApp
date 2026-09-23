import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { env } from "../config/env";
import { loginUser, registerUser, verifyToken } from "./auth.service";

describe("auth service", () => {
  it("rejects registration with an invalid password", async () => {
    await expect(registerUser({ name: "Test User", email: "test@example.com", password: "short" })).rejects.toMatchObject({ name: "ZodError" });
  });

  it("rejects login with an invalid email", async () => {
    await expect(loginUser({ email: "not-an-email", password: "password123" })).rejects.toMatchObject({ name: "ZodError" });
  });

  it("verifies a signed user token", () => {
    const token = jwt.sign({ sub: "507f1f77bcf86cd799439011" }, env.jwtSecret, { expiresIn: "1m" });
    expect(verifyToken(token)).toBe("507f1f77bcf86cd799439011");
  });
});
