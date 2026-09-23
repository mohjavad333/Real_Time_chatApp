import "dotenv/config";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

function mask(value?: string) {
  if (!value) return "(empty)";
  if (value.length <= 10) return "***";
  return `${value.slice(0, 8)}...${value.slice(-3)}`;
}

const mongoUri = process.env.MONGO_URI ?? "";
const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? "";
const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET ?? "";
const cloudinaryUrl = process.env.CLOUDINARY_URL ?? "";
const jwtSecret = process.env.JWT_SECRET ?? "";

console.log("== .env key presence (values masked) ==");
console.log(`MONGO_URI                : ${mask(mongoUri)}`);
console.log(`CLOUDINARY_CLOUD_NAME    : ${cloudName ? "set" : "(empty)"}`);
console.log(`CLOUDINARY_API_KEY       : ${mask(apiKey)}`);
console.log(`CLOUDINARY_API_SECRET    : ${mask(apiSecret)}`);
console.log(`CLOUDINARY_UPLOAD_PRESET : ${uploadPreset || "(empty)"}`);
console.log(`CLOUDINARY_URL           : ${mask(cloudinaryUrl)}  <- NOT used by this app's config`);
console.log(`JWT_SECRET               : ${jwtSecret ? "set" : "(empty)"}`);
if (jwtSecret === "replace-with-a-long-random-secret") {
  console.log("WARNING: JWT_SECRET is still the placeholder from .env.example — generate a real one with: openssl rand -hex 32");
}

console.log("\n== Tests ==");

const mongoFormatOk = /^(mongodb(\+srv)?:\/\/)\S+/.test(mongoUri);
console.log(`MONGO_URI format (mongodb:// or mongodb+srv://): ${mongoFormatOk ? "VALID" : "INVALID"}`);

async function main() {
  if (mongoUri && mongoFormatOk) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log("MONGO_URI connection test: SUCCESS");
      await mongoose.disconnect();
    } catch (error) {
      console.log(`MONGO_URI connection test: FAILED -> ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    console.log("MONGO_URI connection test: SKIPPED (missing or malformed)");
  }

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    try {
      await cloudinary.api.ping();
      console.log("Cloudinary credentials test (api.ping): SUCCESS");
    } catch (error) {
      console.log(`Cloudinary credentials test (api.ping): FAILED -> ${error instanceof Error ? error.message : String(error)}`);
    }
    if (uploadPreset) {
      try {
        const presets = await cloudinary.api.upload_presets();
        const found = (presets.presets ?? []).some((preset: { name: string }) => preset.name === uploadPreset);
        console.log(`Upload preset "${uploadPreset}" exists on the account: ${found ? "YES" : "NO (unsigned uploads will fail)"}`);
      } catch {
        // Some accounts restrict listing presets; not fatal.
        console.log(`Upload preset "${uploadPreset}" existence: could not be listed (account restrictions) — will be verified on first upload`);
      }
    }
  } else {
    console.log("Cloudinary test: SKIPPED — this app needs CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET (not CLOUDINARY_URL)");
  }
}

main().finally(() => process.exit(0));
