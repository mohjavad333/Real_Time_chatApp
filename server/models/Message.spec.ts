import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { Message } from "./Message";

/**
 * Regression test for the real-world chat delivery bug:
 * Mongoose 9 removed the `next` callback from middleware, so a `pre("validate")`
 * hook written in the old callback style crashed with "next is not a function"
 * on every Message.create() — messages were never saved or broadcast.
 *
 * `document.validate()` runs the pre/post "validate" hooks (exactly the code
 * path that broke) without touching the database, so these tests are safe to
 * run in CI without Mongo.
 */
describe("Message model (real schema)", () => {
  const baseMessage = {
    conversationId: new mongoose.Types.ObjectId(),
    senderId: new mongoose.Types.ObjectId(),
    readBy: [new mongoose.Types.ObjectId()],
  };

  it("validates a text message without the legacy `next is not a function` failure", async () => {
    const message = new Message({ ...baseMessage, text: "Hello B!" });

    // Before the fix, this rejected with a TypeError ("next is not a function").
    await expect(message.validate()).resolves.toBeUndefined();
    expect(message.text).toBe("Hello B!");
  });

  it("validates an image-only message", async () => {
    const message = new Message({
      ...baseMessage,
      imageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    });

    await expect(message.validate()).resolves.toBeUndefined();
    expect(message.imageUrl).toContain("cloudinary");
    expect(message.text).toBeUndefined();
  });

  it("rejects a message with neither text nor image", async () => {
    const message = new Message(baseMessage);

    await expect(message.validate()).rejects.toThrow(/text or an image/);
  });
});
