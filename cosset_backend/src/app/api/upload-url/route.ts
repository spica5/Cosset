import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';
import { getAuthenticatedUser } from 'src/utils/request-auth';
import {
  getObjectAcl,
  getStorageProvider,
  getSignedReadUrl,
  getSignedUploadUrl,
} from 'src/utils/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const DEFAULT_UPLOAD_URL_TTL_SECONDS = 60 * 60; // 1 hour

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
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip: 'application/zip',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
    oga: 'audio/ogg',
  };

  return map[ext.toLowerCase()] || 'application/octet-stream';
}

type UploadUrlRequest = {
  key: string;
  contentType: string;
  isPublic: boolean;
};

function resolveContentType(key: string, requestedContentType: string) {
  if (requestedContentType) {
    return requestedContentType;
  }

  const ext = key.split('.').pop()?.toLowerCase() || '';
  return getMimeType(ext);
}

async function parseUploadUrlRequest(req: NextRequest): Promise<UploadUrlRequest | { error: string }> {
  if (req.method === 'GET') {
    const key = String(req.nextUrl.searchParams.get('key') || '').trim();
    const contentType = String(req.nextUrl.searchParams.get('contentType') || '').trim();
    const isPublic = req.nextUrl.searchParams.get('public') === 'true';

    if (!key) {
      return { error: 'key is required' };
    }

    return {
      key,
      contentType: resolveContentType(key, contentType),
      isPublic,
    };
  }

  const body = await req.json().catch(() => null);
  const key = String(body?.key || '').trim();
  const contentType = String(body?.contentType || '').trim();
  const isPublic = body?.public === true || body?.public === 'true';

  if (!key) {
    return { error: 'key is required' };
  }

  return {
    key,
    contentType: resolveContentType(key, contentType),
    isPublic,
  };
}

async function createUploadUrlResponse(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return response({ message: 'Unauthorized' }, STATUS.UNAUTHORIZED);
  }

  const parsed = await parseUploadUrlRequest(req);
  if ('error' in parsed) {
    return response({ message: parsed.error }, STATUS.BAD_REQUEST);
  }

  const { key, contentType, isPublic } = parsed;

  if (key.startsWith('public:')) {
    return response(
      { message: 'Upload key must not include the public: prefix' },
      STATUS.BAD_REQUEST,
    );
  }

  if (key.startsWith('http://') || key.startsWith('https://')) {
    return response({ message: 'Upload key must be an object key, not a URL' }, STATUS.BAD_REQUEST);
  }

  const uploadUrl = await getSignedUploadUrl(
    key,
    contentType,
    isPublic,
    DEFAULT_UPLOAD_URL_TTL_SECONDS,
  );
  const url = await getSignedReadUrl(key, isPublic);
  const acl = getObjectAcl(isPublic) || (isPublic ? 'public' : 'private');

  // Browser uploads PUT the file directly to the storage endpoint (R2/S3).
  // The file body never passes through this Vercel/Next.js API.
  return response(
    {
      key,
      uploadUrl,
      contentType,
      url,
      acl,
      method: 'PUT',
      expiresIn: DEFAULT_UPLOAD_URL_TTL_SECONDS,
      provider: getStorageProvider(),
    },
    STATUS.OK,
  );
}

/**
 * Authenticated temporary upload URL for direct browser → R2/S3 PUT.
 *
 * Flow: client calls this API → receives a short-lived presigned URL →
 * uploads the file bytes directly to Cloudflare R2 (or S3).
 */
export async function GET(req: NextRequest) {
  try {
    return await createUploadUrlResponse(req);
  } catch (error) {
    return handleError('Upload URL - Get', error as Error);
  }
}

export async function POST(req: NextRequest) {
  try {
    return await createUploadUrlResponse(req);
  } catch (error) {
    return handleError('Upload URL - Post', error as Error);
  }
}
