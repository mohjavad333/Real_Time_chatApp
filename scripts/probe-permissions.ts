import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

// Probes which API actions the key is allowed to perform:
// ping (read) / list resources (admin read) / upload (create).
// This pinpoints whether the 403 is a scoped-key permission issue.

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  api_key: process.env.CLOUDINARY_API_KEY ?? "",
  api_secret: process.env.CLOUDINARY_API_SECRET ?? "",
});

async function probe(label: string, action: () => Promise<unknown>) {
  try {
    await action();
    console.log(`${label}: ALLOWED`);
  } catch (error) {
    const err = error as { http_code?: number; message?: string };
    console.log(`${label}: DENIED (http ${err.http_code ?? "?"}) ${err.message ?? ""}`);
  }
}

await probe("ping    (health check)  ", () => cloudinary.api.ping());
await probe("read    (list resources)", () => cloudinary.api.resources({ max_results: 1 }));
await probe(
  "create  (image upload)  ",
  () =>
    new Promise((resolve, reject) => {
      const pixel = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "base64",
      );
      const stream = cloudinary.uploader.upload_stream({ folder: "loop/chat" }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
      stream.end(pixel);
    }),
);
