import type { NextRequest } from 'next/server';

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import { STATUS, response, handleError } from 'src/utils/response';

import {
  createAlbumImage,
  getImagesByAlbumId,  
} from 'src/models/album-images';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// ----------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const s3 = new S3Client({
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

function getFileExtension(file: File): string {
  const name = file.name;
  const lastDot = name.lastIndexOf('.');
  return lastDot !== -1 ? name.substring(lastDot + 1) : '';
}

async function uploadToS3(key: string, content: Buffer, contentType: string) {
  if (!key) throw new Error("key is required");
  if (!content) throw new Error("content is required");
  if (!contentType) throw new Error("contentType is required");

  const bucket = requireEnv('S3_BUCKET');
  if (!bucket) throw new Error("S3_BUCKET env var is missing");

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: content,
    ACL: "private",
    ContentType: contentType,
  });

  return s3.send(command);
}

// ----------------------------------------------------------------------

/**
 * Get all images for an album
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const albumId = parseInt(id, 10);

    if (Number.isNaN(albumId)) {
      return response({ message: 'Invalid album ID' }, STATUS.BAD_REQUEST);
    }

    const images = await getImagesByAlbumId(albumId);

    return response({ images }, STATUS.OK);
  } catch (error) {
    return handleError('Album Images - Get', error as Error);
  }
}

/**
 * Upload new images to an album
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const albumId = parseInt(id, 10);

    if (Number.isNaN(albumId)) {
      return response({ message: 'Invalid album ID' }, STATUS.BAD_REQUEST);
    }

    const formData = await req.formData();
    const imageTitle = formData.get('imageTitle') as string | null;
    const description = formData.get('description') as string | null;

    // Handle multiple files
    const files: File[] = [];
    formData.forEach((value, key) => {
      if (key === 'images' && value instanceof File) {
        files.push(value);
      } else if (key === 'file' && value instanceof File) {
        // Also handle single 'file' field for backward compatibility
        files.push(value);
      }
    });

    if (files.length === 0) {
      return response({ message: 'At least one file is required' }, STATUS.BAD_REQUEST);
    }

    // Upload all files and create image records
    const createdImages = await Promise.all(
      files.map(async (file) => {
        // Validate file
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 5MB limit`);
        }

        // Generate S3 key: album-images/{albumId}/{timestamp}-{filename}
        const ext = getFileExtension(file);
        const s3Key = `album-images/${albumId}/${Date.now()}-${file.name}`;
        const contentType = getMimeType(ext);

        // Upload to S3
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const uploadResult = await uploadToS3(s3Key, buffer, contentType);

        if (uploadResult.$metadata?.httpStatusCode !== 200) {
          throw new Error(`Failed to upload ${file.name} to S3`);
        }

        // Create album image record with S3 key
        const newImage = await createAlbumImage({
          albumId,
          imageTitle: imageTitle || file.name.replace(/\.[^.]*$/, ''),
          fileUrl: s3Key, // Store S3 key instead of filename
          mimeType: file.type,
          bytes: file.size,
          description: description || '',
        });

        return newImage;
      })
    );

    return response({ images: createdImages }, STATUS.OK);
  } catch (error) {
    return handleError('Album Images - Upload', error as Error);
  }
}

