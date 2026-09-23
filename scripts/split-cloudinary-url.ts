import { readFileSync, writeFileSync } from "node:fs";

// Parses CLOUDINARY_URL (cloudinary://<api_key>:<api_secret>@<cloud_name>) from .env
// and fills in the CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
// entries in place. Never prints secret values.

const envPath = ".env";
const raw = readFileSync(envPath, "utf8");

const urlLine = raw.split(/\r?\n/).find((line) => /^CLOUDINARY_URL=/.test(line.trim()));
if (!urlLine) {
  console.error("CLOUDINARY_URL not found in .env — nothing to do.");
  process.exit(1);
}

const value = urlLine.slice(urlLine.indexOf("=") + 1).trim();
const match = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(value);
if (!match) {
  console.error("CLOUDINARY_URL format not recognized. Expected: cloudinary://<api_key>:<api_secret>@<cloud_name>");
  process.exit(1);
}

const [, apiKey, apiSecret, cloudName] = match;

function upsert(lines: string[], key: string, newValue: string) {
  const index = lines.findIndex((line) => new RegExp(`^${key}=`).test(line.trim()));
  if (index === -1) return lines;
  const hadInlineComment = /#/.test(lines[index]);
  if (hadInlineComment) {
    // Keep the comment part, replace only the value before it.
    const commentIndex = lines[index].indexOf("#");
    return lines.map((line, i) => (i === index ? `${key}=${newValue} ${line.slice(commentIndex)}` : line));
  }
  return lines.map((line, i) => (i === index ? `${key}=${newValue}` : line));
}

let lines = raw.split(/\r?\n/);
lines = upsert(lines, "CLOUDINARY_CLOUD_NAME", cloudName);
lines = upsert(lines, "CLOUDINARY_API_KEY", apiKey);
lines = upsert(lines, "CLOUDINARY_API_SECRET", apiSecret);

writeFileSync(envPath, lines.join("\n"));

console.log("Updated .env:");
console.log(`  CLOUDINARY_CLOUD_NAME  -> set to the cloud name from CLOUDINARY_URL`);
console.log(`  CLOUDINARY_API_KEY     -> set (value masked)`);
console.log(`  CLOUDINARY_API_SECRET  -> set (value masked)`);
console.log("Re-run `npx tsx scripts/verify-env.ts` to confirm the Cloudinary connection works.");
