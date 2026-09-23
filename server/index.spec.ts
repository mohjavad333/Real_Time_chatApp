import request from "supertest";
import { describe, expect, it } from "vitest";
import { createServer } from "./index";

const app = createServer();

describe("API smoke tests", () => {
  it("returns service health", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", service: "loop-api" });
  });

  it("returns JSON for unknown API routes", async () => {
    const response = await request(app).get("/api/does-not-exist");
    expect(response.status).toBe(404);
    expect(response.body.message).toContain("Route not found");
  });

  it("protects chat and media routes", async () => {
    const chatResponse = await request(app).get("/api/chat/conversations");
    const mediaResponse = await request(app).post("/api/media/images");
    expect(chatResponse.status).toBe(401);
    expect(mediaResponse.status).toBe(401);
  });
});
