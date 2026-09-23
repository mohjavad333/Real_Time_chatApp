import "dotenv/config";
import crypto from "node:crypto";

// Makes a raw signed upload request to Cloudinary and prints the FULL response
// body, since the SDK hides the details behind "UnexpectedResponse".

const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? "";
const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";

const timestamp = Math.floor(Date.now() / 1000);
const params: Record<string, string | number> = { folder: "loop/chat", timestamp };

// Cloudinary signature: sha1 of sorted "key=value&..." + api_secret
const toSign = Object.keys(params)
  .sort()
  .map((key) => `${key}=${params[key]}`)
  .join("&");
const signature = crypto.createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");

const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const body = new URLSearchParams({
  file: `data:image/png;base64,${pixel.toString("base64")}`,
  folder: String(params.folder),
  timestamp: String(params.timestamp),
  api_key: apiKey,
  signature,
});

const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
const response = await fetch(url, { method: "POST", body });
const text = await response.text();
console.log(`HTTP status: ${response.status}`);
console.log("Response body:");
console.log(text);
