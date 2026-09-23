import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

// Calls Cloudinary's uploader directly and prints the RAW error so we can see
// the actual API response (the app wrapper hides it behind a generic message).

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  api_key: process.env.CLOUDINARY_API_KEY ?? "",
  api_secret: process.env.CLOUDINARY_API_SECRET ?? "",
});

const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

try {
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "loop/chat" }, (error, uploadResult) => {
      if (error) reject(error);
      else resolve(uploadResult);
    });
    stream.end(pixel);
  });
  console.log("Direct upload SUCCESS:", (result as { secure_url: string }).secure_url);
} catch (error: unknown) {
  const err = error as { message?: string; http_code?: number; name?: string };
  console.log("Direct upload FAILED");
  console.log(`  name     : ${err.name}`);
  console.log(`  http_code: ${err.http_code}`);
  console.log(`  message  : ${err.message}`);
}
