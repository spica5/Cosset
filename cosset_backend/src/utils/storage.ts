import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  type ObjectCannedACL,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';

// ----------------------------------------------------------------------

export type StorageProvider = 's3' | 'r2';

export type StorageObjectSummary = {
  key: string;
  size: number;
  lastModified: string | null;
  etag: string | null;
  storageClass: string | null;
};

type StorageConfig = {
  provider: StorageProvider;
  region: string;
  endpoint?: string;
  forcePathStyle: boolean;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Optional CDN / custom domain base for public objects (no trailing slash). */
  publicBaseUrl?: string;
  /** R2 and some S3-compatible stores do not honor AWS-style object ACLs. */
  supportsAcl: boolean;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim().replace(/^['"]|['"]$/g, '');
  return value || undefined;
}

function normalizeEndpoint(endpoint: string) {
  return endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
}

function resolveProvider(): StorageProvider {
  const raw = (process.env.STORAGE_PROVIDER || 's3').trim().toLowerCase();

  if (raw === 'r2' || raw === 'cloudflare' || raw === 'cloudflare-r2') {
    return 'r2';
  }

  if (raw === 's3' || raw === 'aws' || raw === 'aws-s3') {
    return 's3';
  }

  throw new Error(
    `Invalid STORAGE_PROVIDER "${process.env.STORAGE_PROVIDER}". Use "s3" or "r2".`,
  );
}

function resolveS3Config(): StorageConfig {
  const endpointRaw = optionalEnv('AWS_S3_ENDPOINT');
  // Treat regional/global AWS endpoints as native S3 (no custom endpoint / path-style).
  const isNativeAwsEndpoint =
    !endpointRaw ||
    /^https?:\/\/(s3|s3\.[a-z0-9-]+)\.amazonaws\.com\/?$/i.test(endpointRaw);

  const endpoint =
    endpointRaw && !isNativeAwsEndpoint ? normalizeEndpoint(endpointRaw) : undefined;
  const publicBaseUrl = optionalEnv('S3_PUBLIC_BASE_URL') || optionalEnv('AWS_S3_PUBLIC_BASE_URL');

  return {
    provider: 's3',
    region: requireEnv('AWS_REGION'),
    endpoint,
    forcePathStyle: Boolean(endpoint) || process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
    accessKeyId: requireEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY'),
    bucket: requireEnv('S3_BUCKET'),
    publicBaseUrl: publicBaseUrl ? normalizeEndpoint(publicBaseUrl) : undefined,
    supportsAcl: process.env.AWS_S3_DISABLE_ACL !== 'true',
  };
}

function resolveR2Config(): StorageConfig {
  const accountId = optionalEnv('R2_ACCOUNT_ID') || optionalEnv('CLOUDFLARE_ACCOUNT_ID');
  const endpointOverride = optionalEnv('R2_ENDPOINT');

  let endpoint: string;
  if (endpointOverride) {
    endpoint = normalizeEndpoint(endpointOverride);
  } else if (accountId) {
    endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  } else {
    throw new Error(
      'R2 storage requires R2_ACCOUNT_ID (or CLOUDFLARE_ACCOUNT_ID) or R2_ENDPOINT',
    );
  }

  const publicBaseUrl = optionalEnv('R2_PUBLIC_BASE_URL');

  return {
    provider: 'r2',
    // Cloudflare R2 signing expects the "auto" region.
    region: optionalEnv('R2_REGION') || 'auto',
    endpoint,
    // Virtual-hosted–style URLs work best for browser PUT with CORS on R2.
    forcePathStyle: process.env.R2_FORCE_PATH_STYLE === 'true',
    accessKeyId: optionalEnv('R2_ACCESS_KEY_ID') || requireEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: optionalEnv('R2_SECRET_ACCESS_KEY') || requireEnv('AWS_SECRET_ACCESS_KEY'),
    bucket: optionalEnv('R2_BUCKET') || requireEnv('S3_BUCKET'),
    publicBaseUrl: publicBaseUrl ? normalizeEndpoint(publicBaseUrl) : undefined,
    // R2 does not use AWS object ACLs; public access is via bucket/custom domain settings.
    supportsAcl: false,
  };
}

export function getProviderConfig(provider: StorageProvider): StorageConfig {
  return provider === 'r2' ? resolveR2Config() : resolveS3Config();
}

function resolveStorageConfig(): StorageConfig {
  return getProviderConfig(resolveProvider());
}

function createClient(config: StorageConfig): S3Client {
  return new S3Client({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

// ----------------------------------------------------------------------

let cachedConfig: StorageConfig | null = null;
let cachedClient: S3Client | null = null;
const providerClientCache = new Map<StorageProvider, S3Client>();

export function getStorageConfig(): StorageConfig {
  if (!cachedConfig) {
    cachedConfig = resolveStorageConfig();
  }
  return cachedConfig;
}

export function getStorageProvider(): StorageProvider {
  return getStorageConfig().provider;
}

export function getStorageBucket(): string {
  return getStorageConfig().bucket;
}

export function getStorageClient(): S3Client {
  if (!cachedClient) {
    cachedClient = createClient(getStorageConfig());
  }
  return cachedClient;
}

export function getProviderClient(provider: StorageProvider): S3Client {
  const cached = providerClientCache.get(provider);
  if (cached) {
    return cached;
  }

  const client = createClient(getProviderConfig(provider));
  providerClientCache.set(provider, client);
  return client;
}

export function isProviderConfigured(provider: StorageProvider): boolean {
  try {
    getProviderConfig(provider);
    return true;
  } catch {
    return false;
  }
}

/** Whether PutObject / multipart create should include an ACL field. */
export function storageSupportsAcl(): boolean {
  return getStorageConfig().supportsAcl;
}

export function getObjectAcl(isPublic: boolean): ObjectCannedACL | undefined {
  if (!storageSupportsAcl()) {
    return undefined;
  }
  return isPublic ? 'public-read' : 'private';
}

export function buildPublicObjectUrl(key: string): string {
  const config = getStorageConfig();

  if (config.publicBaseUrl) {
    return `${config.publicBaseUrl}/${key}`;
  }

  if (!config.endpoint) {
    // Native AWS virtual-hosted–style URL.
    return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
  }

  return `${config.endpoint}/${config.bucket}/${key}`;
}

export async function getSignedReadUrl(
  key: string,
  isPublic = false,
  expiresInSeconds = 60 * 10,
): Promise<string> {
  if (isPublic) {
    return buildPublicObjectUrl(key);
  }

  const client = getStorageClient();
  const bucket = getStorageBucket();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function getProviderSignedReadUrl(
  provider: StorageProvider,
  key: string,
  expiresInSeconds = 60 * 10,
): Promise<string> {
  const config = getProviderConfig(provider);
  const client = getProviderClient(provider);
  const command = new GetObjectCommand({ Bucket: config.bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  isPublic = false,
  expiresInSeconds = 60 * 60 * 2,
): Promise<string> {
  const client = getStorageClient();
  const bucket = getStorageBucket();
  const acl = getObjectAcl(isPublic);

  const input: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ...(acl ? { ACL: acl } : {}),
  };

  return getSignedUrl(client, new PutObjectCommand(input), { expiresIn: expiresInSeconds });
}

export async function putObject(input: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  isPublic?: boolean;
}) {
  const { key, body, contentType, isPublic = false } = input;
  if (!key) throw new Error('key is required');
  if (!body) throw new Error('content is required');
  if (!contentType) throw new Error('contentType is required');

  const client = getStorageClient();
  const bucket = getStorageBucket();
  const acl = getObjectAcl(isPublic);

  return client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ...(acl ? { ACL: acl } : {}),
    }),
  );
}

export async function deleteObject(key: string) {
  if (!key) throw new Error('key is required');

  const client = getStorageClient();
  const bucket = getStorageBucket();

  return client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function deleteProviderObject(provider: StorageProvider, key: string) {
  if (!key) throw new Error('key is required');

  const config = getProviderConfig(provider);
  const client = getProviderClient(provider);

  return client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );
}

export async function deleteProviderObjects(
  provider: StorageProvider,
  keys: string[],
): Promise<Array<{ key: string; status: 'deleted' | 'failed'; message?: string }>> {
  const uniqueKeys = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];

  return Promise.all(
    uniqueKeys.map(async (key) => {
      try {
        await deleteProviderObject(provider, key);
        return { key, status: 'deleted' as const };
      } catch (error) {
        return {
          key,
          status: 'failed' as const,
          message: error instanceof Error ? error.message : 'Delete failed.',
        };
      }
    }),
  );
}

export async function getObject(key: string) {
  if (!key) throw new Error('key is required');

  const client = getStorageClient();
  const bucket = getStorageBucket();

  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}

export async function listProviderObjects(input: {
  provider: StorageProvider;
  prefix?: string;
  continuationToken?: string;
  maxKeys?: number;
  /** Use "/" for folder browsing. Pass null/false for a flat listing. */
  delimiter?: string | null | false;
}): Promise<{
  objects: StorageObjectSummary[];
  prefixes: string[];
  nextContinuationToken: string | null;
  isTruncated: boolean;
  provider: StorageProvider;
  bucket: string;
}> {
  const { provider, prefix = '', continuationToken, maxKeys = 100 } = input;
  const delimiter =
    input.delimiter === null || input.delimiter === false
      ? undefined
      : (input.delimiter ?? '/');
  const config = getProviderConfig(provider);
  const client = getProviderClient(provider);

  const result = await client.send(
    new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: prefix || undefined,
      ContinuationToken: continuationToken || undefined,
      MaxKeys: Math.min(Math.max(maxKeys, 1), 1000),
      Delimiter: delimiter,
    }),
  );

  const objects: StorageObjectSummary[] = (result.Contents || [])
    .filter((item) => {
      const key = String(item.Key || '');
      if (!key) return false;
      // Skip folder placeholder objects.
      if (key.endsWith('/')) return false;
      if (prefix && key === prefix) return false;
      return true;
    })
    .map((item) => ({
      key: String(item.Key),
      size: Number(item.Size || 0),
      lastModified: item.LastModified ? item.LastModified.toISOString() : null,
      etag: item.ETag ? String(item.ETag).replace(/"/g, '') : null,
      storageClass: item.StorageClass ? String(item.StorageClass) : null,
    }));

  const prefixes = (result.CommonPrefixes || [])
    .map((item) => item.Prefix)
    .filter((value): value is string => Boolean(value));

  return {
    objects,
    prefixes,
    nextContinuationToken: result.NextContinuationToken || null,
    isTruncated: Boolean(result.IsTruncated),
    provider,
    bucket: config.bucket,
  };
}

export async function providerObjectExists(
  provider: StorageProvider,
  key: string,
): Promise<boolean> {
  const config = getProviderConfig(provider);
  const client = getProviderClient(provider);

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );
    return true;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number }; name?: string })?.$metadata
      ?.httpStatusCode;
    const name = (error as { name?: string })?.name;
    if (status === 404 || name === 'NotFound' || name === 'NoSuchKey') {
      return false;
    }
    throw error;
  }
}

export type CopyS3ToR2Result = {
  key: string;
  status: 'copied' | 'skipped' | 'failed';
  message?: string;
  size?: number;
  contentType?: string | null;
};

/**
 * Copy one object from AWS S3 to Cloudflare R2 using the same object key.
 */
export async function copyObjectS3ToR2(input: {
  key: string;
  overwrite?: boolean;
}): Promise<CopyS3ToR2Result> {
  const key = input.key.trim();
  if (!key) {
    return { key: '', status: 'failed', message: 'key is required' };
  }

  const overwrite = input.overwrite === true;

  try {
    if (!overwrite) {
      const existsOnR2 = await providerObjectExists('r2', key);
      if (existsOnR2) {
        return {
          key,
          status: 'skipped',
          message: 'Object already exists on R2 (pass overwrite=true to replace).',
        };
      }
    }

    const s3Config = getProviderConfig('s3');
    const r2Config = getProviderConfig('r2');
    const s3 = getProviderClient('s3');
    const r2 = getProviderClient('r2');

    const source = await s3.send(
      new GetObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
      }),
    );

    if (!source.Body) {
      return { key, status: 'failed', message: 'Source object has no body.' };
    }

    const contentType = source.ContentType || 'application/octet-stream';
    const size = Number(source.ContentLength || 0);

    const upload = new Upload({
      client: r2,
      params: {
        Bucket: r2Config.bucket,
        Key: key,
        Body: source.Body,
        ContentType: contentType,
        ...(source.CacheControl ? { CacheControl: source.CacheControl } : {}),
        ...(source.ContentDisposition ? { ContentDisposition: source.ContentDisposition } : {}),
        ...(source.ContentEncoding ? { ContentEncoding: source.ContentEncoding } : {}),
        ...(source.Metadata && Object.keys(source.Metadata).length
          ? { Metadata: source.Metadata }
          : {}),
      },
      leavePartsOnError: false,
    });

    await upload.done();

    return {
      key,
      status: 'copied',
      size,
      contentType,
    };
  } catch (error) {
    return {
      key,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Copy failed.',
    };
  }
}

export async function copyObjectsS3ToR2(input: {
  keys: string[];
  overwrite?: boolean;
  concurrency?: number;
}): Promise<CopyS3ToR2Result[]> {
  const keys = [...new Set(input.keys.map((key) => key.trim()).filter(Boolean))];
  const concurrency = Math.min(Math.max(input.concurrency || 3, 1), 10);

  const batches = keys.reduce<string[][]>((acc, key, index) => {
    const batchIndex = Math.floor(index / concurrency);
    if (!acc[batchIndex]) {
      acc[batchIndex] = [];
    }
    acc[batchIndex].push(key);
    return acc;
  }, []);

  const runBatches = async (
    remaining: string[][],
    accumulated: CopyS3ToR2Result[],
  ): Promise<CopyS3ToR2Result[]> => {
    if (!remaining.length) {
      return accumulated;
    }

    const [batch, ...rest] = remaining;
    const batchResults = await Promise.all(
      batch.map((key) => copyObjectS3ToR2({ key, overwrite: input.overwrite })),
    );

    return runBatches(rest, [...accumulated, ...batchResults]);
  };

  return runBatches(batches, []);
}
