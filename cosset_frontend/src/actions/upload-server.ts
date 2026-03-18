'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// --------------------------------------------------------------------------

export type UploadFileToS3DirectInput = {
  file: File;
  key: string;
  isPublic?: boolean;
};

export type UploadFileToS3DirectResult = {
  key: string;
  url: string;
};

// --------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function createS3Client(): S3Client {
  return new S3Client({
    region: requireEnv('AWS_REGION'),
    endpoint: requireEnv('AWS_S3_ENDPOINT'),
    forcePathStyle: true,
    credentials: {
      accessKeyId: requireEnv('AWS_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY'),
    },
  });
}

// --------------------------------------------------------------------------

/**
 * Upload a file directly to S3 using the AWS SDK and server-side credentials.
 * Runs as a Next.js Server Action — credentials are never exposed to the browser.
 */
export async function uploadFileToS3Direct({
  file,
  key,
  isPublic = false,
}: UploadFileToS3DirectInput): Promise<UploadFileToS3DirectResult> {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    throw new Error('Upload key is required.');
  }

  const bucket = requireEnv('S3_BUCKET');
  const s3 = createS3Client();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = file.type || 'application/octet-stream';

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: normalizedKey,
    Body: buffer,
    ACL: isPublic ? 'public-read' : 'private',
    ContentType: contentType,
  });

  await s3.send(command);

  const endpoint = requireEnv('AWS_S3_ENDPOINT');
  const url = isPublic ? `${endpoint}/${bucket}/${normalizedKey}` : '';

  return { key: normalizedKey, url };
}
