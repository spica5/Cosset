import type {
  IDocumentationDocument,
  IDocumentationUsage,
} from 'src/types/documentation';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

type DocumentsData = {
  documents?: IDocumentationDocument[];
};

type DocumentData = {
  document?: IDocumentationDocument;
};

type UsageData = {
  usage?: IDocumentationUsage;
};

export const getDocumentationListEndpoint = (customerId?: string | number | '' | null) => {
  const normalized = String(customerId ?? '').trim();
  return normalized
    ? `${endpoints.documentation.list}?customerId=${encodeURIComponent(normalized)}`
    : null;
};

export const getDocumentationUsageEndpoint = (customerId?: string | number | '' | null) => {
  const normalized = String(customerId ?? '').trim();
  return normalized
    ? `${endpoints.documentation.usage}?customerId=${encodeURIComponent(normalized)}`
    : null;
};

export function useGetDocumentationDocuments(customerId?: string | number | '' | null) {
  const url = getDocumentationListEndpoint(customerId);
  const { data, isLoading, error, isValidating } = useSWR<DocumentsData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      documents: data?.documents || [],
      documentsLoading: isLoading,
      documentsError: error,
      documentsValidating: isValidating,
      documentsEmpty: !isLoading && !(data?.documents || []).length,
    }),
    [data?.documents, error, isLoading, isValidating],
  );
}

export function useGetDocumentationUsage(customerId?: string | number | '' | null) {
  const url = getDocumentationUsageEndpoint(customerId);
  const { data, isLoading, error, isValidating } = useSWR<UsageData>(url, fetcher, swrOptions);

  return useMemo(
    () => ({
      usage: data?.usage || { documentCount: 0, totalBytes: 0 },
      usageLoading: isLoading,
      usageError: error,
      usageValidating: isValidating,
    }),
    [data?.usage, error, isLoading, isValidating],
  );
}

export async function createDocumentationDocument(
  document: Omit<IDocumentationDocument, 'id' | 'createdAt'>,
) {
  const res = await axios.post(endpoints.documentation.add, { document });
  const created = res.data?.document as IDocumentationDocument | undefined;
  const listEndpoint = getDocumentationListEndpoint(document.customerId || created?.customerId);
  const usageEndpoint = getDocumentationUsageEndpoint(document.customerId || created?.customerId);

  if (created && listEndpoint) {
    await mutate<DocumentsData>(
      listEndpoint,
      (current) => ({
        ...current,
        documents: [created, ...(current?.documents || [])],
      }),
      false,
    );
  }

  if (usageEndpoint) {
    await mutate(usageEndpoint);
  }

  return created;
}

export async function updateDocumentationDocument(
  id: string | number,
  updates: Partial<Omit<IDocumentationDocument, 'id' | 'createdAt' | 'customerId'>>,
  customerId?: string | number | null,
) {
  const res = await axios.put(endpoints.documentation.update(id), { updates });
  const updated = res.data?.document as IDocumentationDocument | undefined;
  const listEndpoint = getDocumentationListEndpoint(customerId || updated?.customerId);
  const usageEndpoint = getDocumentationUsageEndpoint(customerId || updated?.customerId);

  if (updated && listEndpoint) {
    await mutate<DocumentsData>(
      listEndpoint,
      (current) => ({
        ...current,
        documents: (current?.documents || []).map((item) =>
          item.id === updated.id ? updated : item,
        ),
      }),
      false,
    );
  }

  if (usageEndpoint) {
    await mutate(usageEndpoint);
  }

  return updated;
}

export async function deleteDocumentationDocument(
  id: string | number,
  customerId?: string | number | null,
) {
  const res = await axios.delete(endpoints.documentation.delete(id));
  const deleted = res.data?.document as IDocumentationDocument | undefined;
  const listEndpoint = getDocumentationListEndpoint(customerId || deleted?.customerId);
  const usageEndpoint = getDocumentationUsageEndpoint(customerId || deleted?.customerId);

  if (listEndpoint) {
    await mutate<DocumentsData>(
      listEndpoint,
      (current) => ({
        ...current,
        documents: (current?.documents || []).filter((item) => item.id !== Number(id)),
      }),
      false,
    );
  }

  if (usageEndpoint) {
    await mutate(usageEndpoint);
  }

  return deleted;
}

export async function setDocumentationFavorite(
  id: string | number,
  isFavorite: boolean,
  customerId?: string | number | null,
) {
  return updateDocumentationDocument(id, { isFavorite: isFavorite ? 1 : 0 }, customerId);
}
