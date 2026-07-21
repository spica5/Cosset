import type { NextRequest } from 'next/server';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  S3Client,
  GetObjectCommand,
  ListPartsCommand,
  UploadPartCommand,
  type CompletedPart,
  AbortMultipartUploadCommand,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
} from '@aws-sdk/client-s3';

import { STATUS, response, handleError } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const MAX_PARTS = 10000;
const MAX_SIGN_PARTS_PER_REQUEST = 1;
const DEFAULT_PART_URL_EXPIRES_SECONDS = 60 * 60 * 2;

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

function normalizeEndpoint(endpoint: string) {
  return endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
}

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
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
  };

  return map[ext.toLowerCase()] || 'application/octet-stream';
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

async function createMultipartUpload(input: {
  key: string;
  contentType: string;
  isPublic: boolean;
}) {
  const bucket = requireEnv('S3_BUCKET');
  const { key, contentType, isPublic } = input;

  const createResult = await s3.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ...(isPublic ? { ACL: 'public-read' as const } : {}),
    }),
  );

  const uploadId = createResult.UploadId;
  if (!uploadId) {
    throw new Error('Failed to create multipart upload.');
  }

  return {
    key,
    uploadId,
    contentType,
  };
}

async function signMultipartParts(input: {
  key: string;
  uploadId: string;
  partNumbers: number[];
}) {
  const bucket = requireEnv('S3_BUCKET');
  const { key, uploadId, partNumbers } = input;

  const parts = await Promise.all(
    partNumbers.map(async (partNumber) => {
      const uploadUrl = await getSignedUrl(
        s3,
        new UploadPartCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
        }),
        { expiresIn: DEFAULT_PART_URL_EXPIRES_SECONDS },
      );

      return { partNumber, uploadUrl };
    }),
  );

  return { key, uploadId, parts };
}

async function listUploadedPartsPage(
  key: string,
  uploadId: string,
  partNumberMarker?: string,
  accumulated: CompletedPart[] = [],
): Promise<CompletedPart[]> {
  const bucket = requireEnv('S3_BUCKET');
  const listed = await s3.send(
    new ListPartsCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      PartNumberMarker: partNumberMarker,
      MaxParts: 1000,
    }),
  );

  const pageParts = (listed.Parts || [])
    .filter((part) => part.PartNumber != null && Boolean(part.ETag))
    .map((part) => ({
      PartNumber: part.PartNumber as number,
      ETag: part.ETag as string,
    }));

  const parts = [...accumulated, ...pageParts];

  if (!listed.IsTruncated) {
    return parts.sort((a, b) => (a.PartNumber || 0) - (b.PartNumber || 0));
  }

  const nextMarker =
    listed.NextPartNumberMarker != null ? String(listed.NextPartNumberMarker) : undefined;

  if (!nextMarker) {
    return parts.sort((a, b) => (a.PartNumber || 0) - (b.PartNumber || 0));
  }

  return listUploadedPartsPage(key, uploadId, nextMarker, parts);
}

async function listUploadedParts(key: string, uploadId: string): Promise<CompletedPart[]> {
  return listUploadedPartsPage(key, uploadId);
}

async function completeMultipartUpload(input: {
  key: string;
  uploadId: string;
  parts?: CompletedPart[] | null;
  isPublic: boolean;
  expectedPartCount?: number;
}) {
  const bucket = requireEnv('S3_BUCKET');
  const { key, uploadId, isPublic, expectedPartCount } = input;

  let parts = await listUploadedParts(key, uploadId);

  if (!parts.length && input.parts?.length) {
    parts = [...input.parts].sort((a, b) => (a.PartNumber || 0) - (b.PartNumber || 0));
  }

  if (!parts.length) {
    throw new Error('No uploaded multipart parts were found to complete.');
  }

  if (expectedPartCount && parts.length < expectedPartCount) {
    throw new Error(
      `Multipart upload is incomplete. Expected ${expectedPartCount} parts, found ${parts.length}.`,
    );
  }

  await s3.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    }),
  );

  const url = await getSignedReadUrl(key, isPublic);
  return { key, url };
}

async function abortMultipartUpload(input: { key: string; uploadId: string }) {
  const bucket = requireEnv('S3_BUCKET');
  const { key, uploadId } = input;

  await s3.send(
    new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
    }),
  );

  return { key, uploadId, aborted: true };
}

function parseCompletedParts(value: unknown): CompletedPart[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const parts: CompletedPart[] = [];
  const hasInvalidPart = value.some((item) => {
    if (!item || typeof item !== 'object') {
      return true;
    }

    const partNumber = Number(
      (item as { partNumber?: unknown; PartNumber?: unknown }).partNumber
        ?? (item as { PartNumber?: unknown }).PartNumber,
    );
    const etagRaw =
      (item as { etag?: unknown; ETag?: unknown }).etag
      ?? (item as { ETag?: unknown }).ETag;
    const etag = typeof etagRaw === 'string' ? etagRaw.trim() : '';

    if (!Number.isInteger(partNumber) || partNumber < 1 || !etag) {
      return true;
    }

    parts.push({
      PartNumber: partNumber,
      ETag: etag,
    });

    return false;
  });

  if (hasInvalidPart) {
    return null;
  }

  return parts;
}

function parsePartNumbers(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const partNumbers = value
    .map((item) => Number(item))
    .filter((partNumber) => Number.isInteger(partNumber) && partNumber >= 1 && partNumber <= MAX_PARTS);

  if (!partNumbers.length || partNumbers.length > MAX_SIGN_PARTS_PER_REQUEST) {
    return null;
  }

  return [...new Set(partNumbers)].sort((a, b) => a - b);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body?.action || '').trim().toLowerCase();
    const key = String(body?.key || '').trim();
    const isPublic = body?.public === true || body?.public === 'true';

    if (!key) {
      return response({ message: 'key is required' }, STATUS.BAD_REQUEST);
    }

    if (key.startsWith('public:')) {
      return response(
        { message: 'Upload key must not include the public: prefix' },
        STATUS.BAD_REQUEST,
      );
    }

    if (action === 'create') {
      const ext = key.split('.').pop()?.toLowerCase() || '';
      const requestedContentType = String(body?.contentType || '').trim();
      const contentType = requestedContentType || getMimeType(ext);

      const created = await createMultipartUpload({
        key,
        contentType,
        isPublic,
      });

      return response(created, STATUS.OK);
    }

    if (action === 'sign-parts') {
      const uploadId = String(body?.uploadId || '').trim();
      const partNumbers = parsePartNumbers(body?.partNumbers);

      if (!uploadId) {
        return response({ message: 'uploadId is required' }, STATUS.BAD_REQUEST);
      }

      if (!partNumbers) {
        return response(
          {
            message: `partNumbers must be a non-empty array of up to ${MAX_SIGN_PARTS_PER_REQUEST} part numbers`,
          },
          STATUS.BAD_REQUEST,
        );
      }

      const signed = await signMultipartParts({
        key,
        uploadId,
        partNumbers,
      });

      return response(signed, STATUS.OK);
    }

    if (action === 'complete') {
      const uploadId = String(body?.uploadId || '').trim();
      const parts = parseCompletedParts(body?.parts);
      const expectedPartCount = Number(body?.partCount);

      if (!uploadId) {
        return response({ message: 'uploadId is required' }, STATUS.BAD_REQUEST);
      }

      const completed = await completeMultipartUpload({
        key,
        uploadId,
        parts,
        isPublic,
        expectedPartCount:
          Number.isInteger(expectedPartCount) && expectedPartCount > 0
            ? expectedPartCount
            : undefined,
      });

      return response(completed, STATUS.OK);
    }

    if (action === 'abort') {
      const uploadId = String(body?.uploadId || '').trim();
      if (!uploadId) {
        return response({ message: 'uploadId is required' }, STATUS.BAD_REQUEST);
      }

      const aborted = await abortMultipartUpload({ key, uploadId });
      return response(aborted, STATUS.OK);
    }

    return response(
      { message: 'action must be one of: create, sign-parts, complete, abort' },
      STATUS.BAD_REQUEST,
    );
  } catch (error) {
    return handleError('Upload Multipart', error as Error);
  }
}
