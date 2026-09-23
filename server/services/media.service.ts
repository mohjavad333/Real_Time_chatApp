import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";

function configureCloudinary() {
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    const error = new Error("Cloudinary is not configured");
    (error as Error & { statusCode?: number }).statusCode = 503;
    throw error;
  }
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

export function uploadImage(buffer: Buffer) {
  configureCloudinary();
  return new Promise<{ secureUrl: string; publicId: string }>((resolve, reject) => {
    const options = { folder: "loop/chat", resource_type: "image" as const };
    const handleUpload = (error: any, result: any) => {
      if (error || !result) {
        const uploadError = new Error("Cloudinary upload failed. Verify the upload preset and Cloudinary account permissions.") as Error & { statusCode?: number };
        uploadError.statusCode = 502;
        reject(uploadError);
        return;
      }
      resolve({ secureUrl: result.secure_url, publicId: result.public_id });
    };
    const stream = env.cloudinary.uploadPreset
      ? cloudinary.uploader.unsigned_upload_stream(env.cloudinary.uploadPreset, options, handleUpload)
      : cloudinary.uploader.upload_stream(options, handleUpload);
    stream.end(buffer);
  });
}
