'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// --------------------------------------------------------------------------

export type UploadFileToS3DirectResult = {
  key: string;
  url: string;
};

const FILE_FIELD_NAME = 'file';
const KEY_FIELD_NAME = 'key';
const IS_PUBLIC_FIELD_NAME = 'isPublic';

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

function getFileFromFormData(formData: FormData) {
  const value = formData.get(FILE_FIELD_NAME);

  if (!(value instanceof File)) {
    throw new Error('Upload file is required.');
  }

  return value;
}

function getKeyFromFormData(formData: FormData) {
  const value = String(formData.get(KEY_FIELD_NAME) || '').trim();

  if (!value) {
    throw new Error('Upload key is required.');
  }

  return value;
}

function getIsPublicFromFormData(formData: FormData) {
  const value = String(formData.get(IS_PUBLIC_FIELD_NAME) || '').trim().toLowerCase();
  return value === '1' || value === 'true';
}

/**
 * Upload a file directly to S3 using the AWS SDK and server-side credentials.
 * This server action expects FormData so file uploads cross the client/server
 * boundary using a supported payload type.
 */
export async function uploadFileToS3Direct(formData: FormData): Promise<UploadFileToS3DirectResult> {
  const file = getFileFromFormData(formData);
  const normalizedKey = getKeyFromFormData(formData);
  const isPublic = getIsPublicFromFormData(formData);

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
