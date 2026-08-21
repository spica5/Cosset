import type { NextRequest } from 'next/server';

import { Readable } from 'node:stream';
import { Upload } from '@aws-sdk/lib-storage';

import { STATUS, response, handleError } from 'src/utils/response';
import {
  getObjectAcl,
  getSignedReadUrl,
  getStorageBucket,
  getStorageClient,
} from 'src/utils/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_VIDEO_SIZE_BYTES = 5 * 1024 * 1024 * 1024;
const STREAM_PART_SIZE = 32 * 1024 * 1024;

function getMimeType(ext: string) {
  const map: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    webm: 'video/webm',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    txt: 'text/plain',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
  };

  return map[ext.toLowerCase()] || 'application/octet-stream';
}

function parseUploadKey(req: NextRequest): string {
  return String(req.nextUrl.searchParams.get('key') || '').trim();
}

function parseContentType(req: NextRequest, key: string): string {
  const fromQuery = String(req.nextUrl.searchParams.get('contentType') || '').trim();
  if (fromQuery) {
    return fromQuery;
  }

  const fromHeader = String(req.headers.get('content-type') || '').trim();
  if (fromHeader && fromHeader !== 'application/octet-stream') {
    return fromHeader;
  }

  const ext = key.split('.').pop()?.toLowerCase() || '';
  return getMimeType(ext);
}

function parseContentLength(req: NextRequest): number {
  const contentLength = Number(req.headers.get('content-length') || 0);
  return Number.isFinite(contentLength) && contentLength > 0 ? contentLength : 0;
}

async function streamBodyToStorage(input: {
  key: string;
  contentType: string;
  isPublic: boolean;
  body: ReadableStream<Uint8Array>;
}) {
  const client = getStorageClient();
  const bucket = getStorageBucket();
  const { key, contentType, isPublic, body } = input;
  const acl = getObjectAcl(isPublic);

  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]),
      ContentType: contentType,
      ...(acl ? { ACL: acl } : {}),
    },
    partSize: STREAM_PART_SIZE,
    leavePartsOnError: false,
  });

  await upload.done();

  const url = await getSignedReadUrl(key, isPublic);
  return { key, url };
}

export async function PUT(req: NextRequest) {
  try {
    const key = parseUploadKey(req);
    const isPublic = req.nextUrl.searchParams.get('public') === 'true';
    const contentType = parseContentType(req, key);
    const contentLength = parseContentLength(req);

    if (!key) {
      return response({ message: 'key is required' }, STATUS.BAD_REQUEST);
    }

    if (key.startsWith('public:')) {
      return response(
        { message: 'Upload key must not include the public: prefix' },
        STATUS.BAD_REQUEST,
      );
    }

    if (!req.body) {
      return response({ message: 'Request body is required' }, STATUS.BAD_REQUEST);
    }

    if (contentLength > MAX_VIDEO_SIZE_BYTES) {
      return response({ message: 'File exceeds the maximum allowed upload size.' }, STATUS.BAD_REQUEST);
    }

    const result = await streamBodyToStorage({
      key,
      contentType,
      isPublic,
      body: req.body,
    });

    return response(result, STATUS.OK);
  } catch (error) {
    return handleError('Upload Stream', error as Error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const isPublic = req.nextUrl.searchParams.get('public') === 'true';
    const formData = await req.formData();
    const file = formData.get('file');
    const key = String(formData.get('key') || '').trim();

    if (!(file instanceof File)) {
      return response({ message: 'file is required' }, STATUS.BAD_REQUEST);
    }

    if (!key) {
      return response({ message: 'key is required' }, STATUS.BAD_REQUEST);
    }

    if (key.startsWith('public:')) {
      return response(
        { message: 'Upload key must not include the public: prefix' },
        STATUS.BAD_REQUEST,
      );
    }

    if (file.size <= 0) {
      return response({ message: 'File is empty.' }, STATUS.BAD_REQUEST);
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      return response({ message: 'File exceeds the maximum allowed upload size.' }, STATUS.BAD_REQUEST);
    }

    const contentType = file.type || parseContentType(req, key);
    const result = await streamBodyToStorage({
      key,
      contentType,
      isPublic,
      body: file.stream(),
    });

    return response(result, STATUS.OK);
  } catch (error) {
    return handleError('Upload Stream', error as Error);
  }
}
