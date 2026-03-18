import type { NextRequest } from 'next/server';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';

import { STATUS, handleError, response } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

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
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    webm: 'video/webm',
    pdf: 'application/pdf',
  };

  return map[ext.toLowerCase()] || 'application/octet-stream';
}

function normalizeEndpoint(endpoint: string) {
  return endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
}

async function getSignedReadUrl(key: string, isPublic: boolean, expiresInSeconds = 60 * 10) {
  const bucket = requireEnv('S3_BUCKET');

  if (isPublic) {
    const endpoint = normalizeEndpoint(requireEnv('AWS_S3_ENDPOINT'));
    return `${endpoint}/${bucket}/${key}`;
  }

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

async function getSignedUploadUrl(
  key: string,
  contentType: string,
  isPublic: boolean,
  expiresInSeconds = 60 * 10,
) {
  const bucket = requireEnv('S3_BUCKET');

  const input: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  };

  if (isPublic) {
    input.ACL = 'public-read';
  }

  const command = new PutObjectCommand(input);

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = String(searchParams.get('key') || '').trim();
    const isPublic = searchParams.get('public') === 'true';

    if (!key) {
      return response({ message: 'key is required' }, STATUS.BAD_REQUEST);
    }

    if (key.startsWith('public:')) {
      return response(
        { message: 'Upload key must not include the public: prefix' },
        STATUS.BAD_REQUEST,
      );
    }

    const ext = key.split('.').pop()?.toLowerCase() || '';
    const requestedContentType = String(searchParams.get('contentType') || '').trim();
    const contentType = requestedContentType || getMimeType(ext);

    const uploadUrl = await getSignedUploadUrl(key, contentType, isPublic);
    const url = await getSignedReadUrl(key, isPublic);
    const acl = isPublic ? 'public-read' : 'private';

    return response({ key, uploadUrl, contentType, url, acl }, STATUS.OK);
  } catch (error) {
    return handleError('Upload Sign - Get URL', error as Error);
  }
}
