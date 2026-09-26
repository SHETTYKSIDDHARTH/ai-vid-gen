import { v2 as cloudinary } from "cloudinary";
import { logApiError } from "@/lib/log-api-error";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

export function extractCloudinaryPublicId(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return match ? match[1] : null;
}

export function uploadBufferToCloudinary(buffer: Buffer, folder: string): Promise<{ secure_url: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ resource_type: "video", folder }, (error, result) => {
        if (error || !result) {
          const finalError = error ?? new Error("Cloudinary upload failed");
          logApiError("Cloudinary", finalError);
          reject(finalError);
          return;
        }
        resolve(result);
      })
      .end(buffer);
  });
}

export default cloudinary;
