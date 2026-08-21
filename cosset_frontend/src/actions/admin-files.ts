import axiosInstance, { endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

export type StorageProviderId = 's3' | 'r2';

export type StorageObjectItem = {
  key: string;
  size: number;
  lastModified: string | null;
  etag: string | null;
  storageClass: string | null;
  inDatabase?: boolean;
};

export type StorageProvidersStatus = {
  activeProvider: StorageProviderId;
  s3: { configured: boolean; bucket: string | null };
  r2: { configured: boolean; bucket: string | null };
};

export type ListStorageObjectsResult = {
  objects: StorageObjectItem[];
  prefixes: string[];
  nextContinuationToken: string | null;
  isTruncated: boolean;
  provider: StorageProviderId;
  bucket: string;
};

export type CopyS3ToR2ItemResult = {
  key: string;
  status: 'copied' | 'skipped' | 'failed';
  message?: string;
  size?: number;
  contentType?: string | null;
};

export async function getAdminStorageProviders(): Promise<StorageProvidersStatus> {
  const res = await axiosInstance.get(endpoints.admin.files.root, {
    params: { action: 'providers' },
  });
  return res.data as StorageProvidersStatus;
}

export async function listAdminStorageObjects(input: {
  provider: StorageProviderId;
  prefix?: string;
  continuationToken?: string;
  maxKeys?: number;
  flat?: boolean;
}): Promise<ListStorageObjectsResult> {
  const res = await axiosInstance.get(endpoints.admin.files.root, {
    params: {
      action: 'list',
      provider: input.provider,
      prefix: input.prefix || undefined,
      continuationToken: input.continuationToken || undefined,
      maxKeys: input.maxKeys || 100,
      flat: input.flat ? 'true' : undefined,
    },
  });
  return res.data as ListStorageObjectsResult;
}

/** Collect every object key under a prefix (recursive / flat, no folder delimiter). */
export async function listAllAdminStorageKeys(input: {
  provider: StorageProviderId;
  prefix?: string;
  onProgress?: (listedCount: number) => void;
}): Promise<string[]> {
  const fetchPages = async (
    accumulated: string[],
    continuationToken?: string,
  ): Promise<string[]> => {
    const res = await axiosInstance.get(endpoints.admin.files.root, {
      params: {
        action: 'list-keys',
        provider: input.provider,
        prefix: input.prefix || undefined,
        continuationToken: continuationToken || undefined,
        maxKeys: 1000,
      },
      timeout: 120_000,
    });

    const pageKeys = Array.isArray(res.data?.keys)
      ? res.data.keys.map((key: unknown) => String(key || '').trim()).filter(Boolean)
      : [];
    const nextKeys = [...accumulated, ...pageKeys];
    input.onProgress?.(nextKeys.length);

    const nextToken = res.data?.nextContinuationToken
      ? String(res.data.nextContinuationToken)
      : undefined;

    if (!nextToken) {
      return [...new Set(nextKeys)];
    }

    return fetchPages(nextKeys, nextToken);
  };

  return fetchPages([]);
}

export async function getAdminStorageObjectUrl(
  provider: StorageProviderId,
  key: string,
): Promise<string> {
  const res = await axiosInstance.get(endpoints.admin.files.root, {
    params: { action: 'url', provider, key },
  });
  return String(res.data?.url || '');
}

export async function deleteAdminStorageObject(provider: StorageProviderId, key: string) {
  await axiosInstance.delete(endpoints.admin.files.root, {
    params: { provider, key },
  });
}

export async function deleteAdminStorageObjects(
  provider: StorageProviderId,
  keys: string[],
): Promise<{
  summary: { total: number; deleted: number; failed: number };
  results: Array<{ key: string; status: 'deleted' | 'failed'; message?: string }>;
}> {
  const res = await axiosInstance.delete(endpoints.admin.files.root, {
    params: { provider },
    data: { keys },
    timeout: 5 * 60 * 1000,
  });

  return {
    summary: res.data?.summary || { total: 0, deleted: 0, failed: 0 },
    results: Array.isArray(res.data?.results) ? res.data.results : [],
  };
}

export async function copyAdminFilesS3ToR2(input: {
  keys: string[];
  overwrite?: boolean;
}): Promise<{
  summary: { total: number; copied: number; skipped: number; failed: number };
  results: CopyS3ToR2ItemResult[];
}> {
  const res = await axiosInstance.post(
    endpoints.admin.files.copyToR2,
    {
      keys: input.keys,
      overwrite: Boolean(input.overwrite),
    },
    { timeout: 5 * 60 * 1000 },
  );

  return {
    summary: res.data?.summary || { total: 0, copied: 0, skipped: 0, failed: 0 },
    results: Array.isArray(res.data?.results) ? res.data.results : [],
  };
}
