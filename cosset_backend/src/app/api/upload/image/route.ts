import type { NextRequest } from 'next/server';

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

import { STATUS, response, handleError } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const s3 = new S3Client({
  // Use a valid AWS-style region (e.g. "us-east-1") for signing,
  // and point to the Vultr endpoint via the custom endpoint setting.
  region: requireEnv('AWS_REGION'),
  endpoint: requireEnv('AWS_S3_ENDPOINT'),
  forcePathStyle: true,
  credentials: {
    accessKeyId: requireEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY'),
  },
});

function getMimeType(ext: string) {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    mp4: "video/mp4",
    mov: "video/quicktime",
    pdf: "application/pdf",
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}

async function uploadToS3(key: string, content: Buffer, contentType: string) {
  if (!key) throw new Error("key is requried");
  if (!content) throw new Error("content is requried");
  if (!contentType) throw new Error("contentType is requried");

  const bucket = requireEnv('S3_BUCKET');
  if (!bucket) throw new Error("S3_BUCKET env var is missing");

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: content,
    ACL: "private",
    ContentType: contentType,
  });

  // console.log(`key:${key} contentType:${contentType}`);

  return s3.send(command);
}

async function getSignedImageUrl(key: string, expiresInSeconds = 60 * 10) {
  const bucket = requireEnv("S3_BUCKET");
  if (!bucket) throw new Error("S3_BUCKET env var is missing");

  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
}

/**
 * Upload multiple files to S3 in parallel
 */
async function uploadMultipleToS3(
  files: Array<{ key: string; content: Buffer; contentType: string }>
) {
  const uploadPromises = files.map((file) =>
    uploadToS3(file.key, file.content, file.contentType)
  );

  return Promise.all(uploadPromises);
}

/**
 * Get signed URLs for multiple keys
 */
async function getSignedImageUrls(keys: string[]) {
  const urlPromises = keys.map((key) => getSignedImageUrl(key));
  return Promise.all(urlPromises);
}

// ----------------------------------------------------------------------

/**
 * GET: Return a signed URL for an image by key.
 * Query: key (required) - S3 object key
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (!key || !key.trim()) {
      return response({ message: 'key is required' }, STATUS.BAD_REQUEST);
    }
    const signedUrl = await getSignedImageUrl(key.trim());
    return response({ url: signedUrl }, STATUS.OK);
  } catch (error) {
    return handleError('Image - Get URL', error as Error);
  }
}

/**
 * Upload one or more image files and return their URLs
 * Supports both single file (file + key) and batch uploads (files as FormData entries)
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Try to get single file first
    const singleFile = formData.get('file') as File | null;
    const singleKey = formData.get('key') as string | null;

    // If single file upload
    if (singleFile && singleKey) {
      if (!singleKey.trim()) {
        return response({ message: "key is required" }, STATUS.BAD_REQUEST);
      }

      if (!singleFile.type.startsWith('image/')) {
        return response({ message: 'File must be an image' }, STATUS.BAD_REQUEST);
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (singleFile.size > maxSize) {
        return response({ message: 'File size must be less than 5MB' }, STATUS.BAD_REQUEST);
      }

      const ext = getFileExtension(singleFile);
      const contentType = getMimeType(ext);
      const arrayBuffer = await singleFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const s3Key = singleKey.trim();

      console.log(`key:${s3Key} contentType:${contentType}`);

      const result = await uploadToS3(s3Key, buffer, contentType);
      if (result.$metadata?.httpStatusCode !== 200) {
        throw new Error("Failed to upload image to S3");
      }

      const signedUrl = await getSignedImageUrl(s3Key);
      return response({ key: s3Key, url: signedUrl }, STATUS.OK);
    }

    // Handle batch uploads
    const files: Array<{ file: File; key: string }> = [];
    formData.forEach((value, key) => {
      if (value instanceof File && key.startsWith('files[')) {
        const fileKey = formData.get(`keys[${key.match(/\d+/)?.[0]}]`) as string | null;
        if (fileKey) {
          files.push({ file: value, key: fileKey });
        }
      }
    });

    if (files.length > 0) {
      // Validate all files
      const invalidImage = files.some(({ file }) => !file.type.startsWith('image/'));
      if (invalidImage) {
        return response({ message: 'All files must be images' }, STATUS.BAD_REQUEST);
      }
      const oversized = files.some(({ file }) => file.size > 5 * 1024 * 1024);
      if (oversized) {
        return response({ message: 'File size must be less than 5MB' }, STATUS.BAD_REQUEST);
      }

      // Prepare uploads (read files in parallel)
      const uploadData: Array<{ key: string; content: Buffer; contentType: string }> =
        await Promise.all(
          files.map(async ({ file, key }) => {
            const ext = getFileExtension(file);
            const contentType = getMimeType(ext);
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return { key: key.trim(), content: buffer, contentType };
          })
        );

      // Upload all files in parallel
      const uploadResults = await uploadMultipleToS3(uploadData);
      if (uploadResults.some((r) => r.$metadata?.httpStatusCode !== 200)) {
        throw new Error("Failed to upload one or more images to S3");
      }

      // Get signed URLs for all uploaded files
      const s3Keys = uploadData.map((u) => u.key);
      const signedUrls = await getSignedImageUrls(s3Keys);

      // Return results
      const results = s3Keys.map((key, idx) => ({
        key,
        url: signedUrls[idx],
      }));

      return response({ results }, STATUS.OK);
    }

    return response(
      { message: "Either 'file' and 'key' or batch files are required" },
      STATUS.BAD_REQUEST
    );
  } catch (error) {
    return handleError('Image Upload', error as Error);
  }
}

/**
 * Helper function to extract file extension from File object
 */
function getFileExtension(file: File): string {
  const name = (file.name ?? "").trim();
  const lastDot = name.lastIndexOf(".");
  if (lastDot > -1 && lastDot < name.length - 1) {
    return name.slice(lastDot + 1).toLowerCase();
  }
  const subtype = (file.type.split("/")[1] ?? "").toLowerCase();
  if (subtype === "jpeg") return "jpg";
  if (subtype) return subtype;
  return "";
}
