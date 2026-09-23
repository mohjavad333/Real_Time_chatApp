import { readFileSync, writeFileSync } from "node:fs";

// Empties CLOUDINARY_UPLOAD_PRESET in .env so media.service.ts uses signed
// uploads (api key/secret) instead of an unsigned preset that does not exist.

const envPath = ".env";
const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
const index = lines.findIndex((line) => /^CLOUDINARY_UPLOAD_PRESET=/.test(line.trim()));
if (index === -1) {
  console.error("CLOUDINARY_UPLOAD_PRESET line not found in .env");
  process.exit(1);
}
lines[index] = "# CLOUDINARY_UPLOAD_PRESET left empty: server uses signed uploads (more secure than an unsigned preset)";
writeFileSync(envPath, lines.join("\n"));
console.log("CLOUDINARY_UPLOAD_PRESET is now empty -> signed uploads will be used.");
