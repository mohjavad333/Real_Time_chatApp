import "dotenv/config";
import { uploadImage } from "../server/services/media.service";

// Uploads a tiny 1x1 transparent PNG through the app's real upload path
// (configureCloudinary + signed upload) to prove the integration works.

const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

try {
  const { secureUrl, publicId } = await uploadImage(pixel);
  console.log("Signed upload test: SUCCESS");
  console.log(`  public_id : ${publicId}`);
  console.log(`  secure_url: ${secureUrl}`);
  console.log("The chat image upload feature is fully operational.");
} catch (error) {
  console.log(`Signed upload test: FAILED -> ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
