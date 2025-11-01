import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// Initialize S3 client for Cloudflare R2 (S3-compatible)
const getS3Client = () => {
  const {
    CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_ACCESS_ID,
    CLOUDFLARE_ACCESS_KEY,
    CLOUDFLARE_ENDPOINT,
  } = process.env;

  const endpoint =
    CLOUDFLARE_ENDPOINT ||
    `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: CLOUDFLARE_ACCESS_ID || "",
      secretAccessKey: CLOUDFLARE_ACCESS_KEY || "",
    },
  });
};

export interface UploadResult {
  url: string;
  key: string;
}

/**
 * Upload a file to Cloudflare R2
 * @param file Buffer or file content
 * @param fileName Original file name
 * @param folder Folder path in R2 bucket (e.g., 'products', 'variants')
 * @returns Upload result with public URL
 */
export async function uploadToR2(
  file: Buffer,
  fileName: string,
  folder: string = "uploads"
): Promise<UploadResult> {
  const {
    CLOUDFLARE_BUCKET_NAME,
    CLOUDFLARE_R2_PUBLIC_URL,
    CLOUDFLARE_ACCOUNT_ID,
  } = process.env;

  if (!CLOUDFLARE_BUCKET_NAME) {
    throw new Error("CLOUDFLARE_BUCKET_NAME is not configured");
  }

  // Generate unique file name
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const fileExtension = fileName.split(".").pop() || "jpg";
  const key = `${folder}/${timestamp}-${randomString}.${fileExtension}`;

  const s3Client = getS3Client();

  // Upload to R2
  const command = new PutObjectCommand({
    Bucket: CLOUDFLARE_BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: getContentType(fileExtension),
  });

  await s3Client.send(command);

  // Generate public URL
  // Note: R2.dev public URLs don't include the bucket name in the path
  let publicUrl: string;
  if (CLOUDFLARE_R2_PUBLIC_URL) {
    // Remove quotes if present and ensure proper format
    const baseUrl = CLOUDFLARE_R2_PUBLIC_URL.replace(
      /^["']|["']$/g,
      ""
    ).replace(/\/$/, "");
    // R2.dev URLs format: https://pub-xxx.r2.dev/{key} (no bucket name in path)
    publicUrl = `${baseUrl}/${key}`;
  } else if (CLOUDFLARE_ACCOUNT_ID) {
    // Construct R2.dev URL (without bucket name)
    publicUrl = `https://pub-${CLOUDFLARE_ACCOUNT_ID}.r2.dev/${key}`;
  } else {
    throw new Error("Public URL configuration missing");
  }

  return {
    url: publicUrl,
    key,
  };
}

/**
 * Get content type based on file extension
 */
function getContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  };

  return contentTypes[extension.toLowerCase()] || "application/octet-stream";
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  const { CLOUDFLARE_BUCKET_NAME } = process.env;

  if (!CLOUDFLARE_BUCKET_NAME) {
    throw new Error("CLOUDFLARE_BUCKET_NAME is not configured");
  }

  const s3Client = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: CLOUDFLARE_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}
