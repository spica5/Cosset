import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';
import { requireAdminUser } from 'src/utils/admin-auth';
import {
  type StorageProvider,
  deleteProviderObjects,
  getProviderConfig,
  getProviderSignedReadUrl,
  isProviderConfigured,
  listProviderObjects,
  providerObjectExists,
} from 'src/utils/storage';
import { findReferencedStorageKeys } from 'src/models/storage-key-references';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function parseProvider(value: string | null): StorageProvider | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 's3' || normalized === 'aws') {
    return 's3';
  }
  if (normalized === 'r2' || normalized === 'cloudflare') {
    return 'r2';
  }
  return null;
}

/** List objects and provider availability for admin file management. */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminUser(req);
    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = req.nextUrl;
    const action = String(searchParams.get('action') || 'list').trim().toLowerCase();

    if (action === 'providers') {
      const active = (process.env.STORAGE_PROVIDER || 's3').trim().toLowerCase();
      return response(
        {
          activeProvider: active === 'r2' || active === 'cloudflare' ? 'r2' : 's3',
          s3: {
            configured: isProviderConfigured('s3'),
            bucket: isProviderConfigured('s3') ? getProviderConfig('s3').bucket : null,
          },
          r2: {
            configured: isProviderConfigured('r2'),
            bucket: isProviderConfigured('r2') ? getProviderConfig('r2').bucket : null,
          },
        },
        STATUS.OK,
      );
    }

    if (action === 'url') {
      const provider = parseProvider(searchParams.get('provider'));
      const key = String(searchParams.get('key') || '').trim();

      if (!provider) {
        return response({ message: 'provider must be s3 or r2' }, STATUS.BAD_REQUEST);
      }
      if (!key) {
        return response({ message: 'key is required' }, STATUS.BAD_REQUEST);
      }

      const url = await getProviderSignedReadUrl(provider, key);
      return response({ key, provider, url }, STATUS.OK);
    }

    if (action === 'exists') {
      const provider = parseProvider(searchParams.get('provider')) || 'r2';
      const key = String(searchParams.get('key') || '').trim();
      if (!key) {
        return response({ message: 'key is required' }, STATUS.BAD_REQUEST);
      }

      const exists = await providerObjectExists(provider, key);
      return response({ key, provider, exists }, STATUS.OK);
    }

    if (action === 'db-check') {
      const keysParam = String(searchParams.get('keys') || '').trim();
      const keys = keysParam
        ? keysParam.split(',').map((value) => value.trim()).filter(Boolean)
        : [];

      if (!keys.length) {
        return response({ message: 'keys is required' }, STATUS.BAD_REQUEST);
      }
      if (keys.length > 200) {
        return response({ message: 'Check at most 200 keys per request' }, STATUS.BAD_REQUEST);
      }

      const referenced = await findReferencedStorageKeys(keys);
      const referencedSet = new Set(referenced);
      return response(
        {
          keys: keys.map((key) => ({
            key,
            inDatabase: referencedSet.has(key),
          })),
        },
        STATUS.OK,
      );
    }

    if (action === 'list-keys') {
      const provider = parseProvider(searchParams.get('provider')) || 's3';
      if (!isProviderConfigured(provider)) {
        return response(
          { message: `${provider.toUpperCase()} is not configured` },
          STATUS.BAD_REQUEST,
        );
      }

      const prefix = String(searchParams.get('prefix') || '').trim();
      const continuationToken = String(searchParams.get('continuationToken') || '').trim();
      const maxKeys = Number.parseInt(searchParams.get('maxKeys') || '1000', 10);

      const listed = await listProviderObjects({
        provider,
        prefix,
        continuationToken: continuationToken || undefined,
        maxKeys: Number.isFinite(maxKeys) ? maxKeys : 1000,
        delimiter: false,
      });

      return response(
        {
          keys: listed.objects.map((item) => item.key),
          nextContinuationToken: listed.nextContinuationToken,
          isTruncated: listed.isTruncated,
          provider: listed.provider,
          bucket: listed.bucket,
          prefix,
        },
        STATUS.OK,
      );
    }

    const provider = parseProvider(searchParams.get('provider')) || 's3';
    if (!isProviderConfigured(provider)) {
      return response(
        { message: `${provider.toUpperCase()} is not configured` },
        STATUS.BAD_REQUEST,
      );
    }

    const prefix = String(searchParams.get('prefix') || '').trim();
    const continuationToken = String(searchParams.get('continuationToken') || '').trim();
    const maxKeys = Number.parseInt(searchParams.get('maxKeys') || '100', 10);
    const flat = searchParams.get('flat') === 'true';

    const listed = await listProviderObjects({
      provider,
      prefix,
      continuationToken: continuationToken || undefined,
      maxKeys: Number.isFinite(maxKeys) ? maxKeys : 100,
      delimiter: flat ? false : '/',
    });

    const referenced = await findReferencedStorageKeys(listed.objects.map((item) => item.key));
    const referencedSet = new Set(referenced);

    return response(
      {
        ...listed,
        objects: listed.objects.map((item) => ({
          ...item,
          inDatabase: referencedSet.has(item.key),
        })),
      },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Admin Files - Get', error as Error);
  }
}

/** Delete one or more objects from S3 or R2. */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdminUser(req);
    if (!auth.ok) {
      return auth.response;
    }

    const provider = parseProvider(req.nextUrl.searchParams.get('provider'));
    const singleKey = String(req.nextUrl.searchParams.get('key') || '').trim();

    let keys: string[] = singleKey ? [singleKey] : [];

    if (!keys.length) {
      const body = await req.json().catch(() => null);
      const keysRaw = Array.isArray(body?.keys) ? body.keys : body?.key ? [body.key] : [];
      keys = keysRaw.map((value: unknown) => String(value || '').trim()).filter(Boolean);
    }

    if (!provider) {
      return response({ message: 'provider must be s3 or r2' }, STATUS.BAD_REQUEST);
    }
    if (!keys.length) {
      return response({ message: 'key or keys is required' }, STATUS.BAD_REQUEST);
    }
    if (keys.length > 100) {
      return response({ message: 'Delete at most 100 keys per request' }, STATUS.BAD_REQUEST);
    }

    const results = await deleteProviderObjects(provider, keys);
    const summary = {
      total: results.length,
      deleted: results.filter((item) => item.status === 'deleted').length,
      failed: results.filter((item) => item.status === 'failed').length,
    };

    return response({ ok: summary.failed === 0, provider, summary, results }, STATUS.OK);
  } catch (error) {
    return handleError('Admin Files - Delete', error as Error);
  }
}
