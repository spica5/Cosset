import type { IAlbumItem } from 'src/types/album';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const ALBUM_ENDPOINT = endpoints.album.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

const getAlbumsListKey = (userId?: string | number | null): string => {
  if (userId === undefined || userId === null || String(userId).trim() === '') {
    return ALBUM_ENDPOINT;
  }

  return `${ALBUM_ENDPOINT}?userId=${encodeURIComponent(String(userId))}`;
};

const isAlbumListKey = (key: unknown): key is string =>
  typeof key === 'string' && key.startsWith(ALBUM_ENDPOINT);

const revalidateAlbumLists = async () => {
  try {
    // Clear cache entries and trigger re-fetch.
    // revalidate: true ensures mounted hooks re-fetch immediately (covers delete
    // while the list is visible) and unmounted keys are cleared so the next
    // mount always fetches fresh data (covers create → navigate back).
    await mutate(isAlbumListKey, undefined, { revalidate: true });
  } catch {
    // Ignore cache refresh failures; CRUD already succeeded on the server.
  }
};

// ----------------------------------------------------------------------

type AlbumsData = {
  albums: IAlbumItem[];
};

export function useGetAlbums(userId?: string | number) {
  const url = userId ? getAlbumsListKey(userId) : null;

  const { data, isLoading, error, isValidating } = useSWR<AlbumsData>(
    url,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      albums: data?.albums || [],
      albumsLoading: isLoading || !userId,
      albumsError: error,
      albumsValidating: isValidating,
      albumsEmpty: !!userId && !isLoading && !data?.albums.length,
    }),
    [data?.albums, error, isLoading, isValidating, userId]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type AlbumData = {
  album: IAlbumItem;
};

type AlbumViewData = {
  totalViews?: number;
  alreadyViewed?: boolean;
  viewedAt?: string | Date | null;
};

type ViewedAlbumsData = {
  viewedAlbumIds?: number[];
};

export function useGetAlbum(albumId: string | number) {
  const url = albumId ? endpoints.album.details(albumId) : '';

  const { data, isLoading, error, isValidating } = useSWR<AlbumData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      album: data?.album,
      albumLoading: isLoading,
      albumError: error,
      albumValidating: isValidating,
    }),
    [data?.album, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetViewedAlbumIds(ownerUserId?: string | number) {
  const url = ownerUserId
    ? `${endpoints.album.view}?ownerUserId=${encodeURIComponent(String(ownerUserId))}`
    : endpoints.album.view;

  const { data, isLoading, error, isValidating } = useSWR<ViewedAlbumsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      viewedAlbumIds: data?.viewedAlbumIds || [],
      viewedAlbumIdsLoading: isLoading,
      viewedAlbumIdsError: error,
      viewedAlbumIdsValidating: isValidating,
    }),
    [data?.viewedAlbumIds, error, isLoading, isValidating],
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export async function createAlbum(album: IAlbumItem) {
  const data = { album };
  const res = await axios.post(endpoints.album.create, data);

  await revalidateAlbumLists();

  return res.data;
}

// ----------------------------------------------------------------------

export async function updateAlbum(id: string | number, album: Partial<IAlbumItem>) {
  const url = endpoints.album.update(id);
  const data = { album };
  const res = await axios.put(url, data);

  // Revalidate album detail and list
  mutate(endpoints.album.details(id));
  await revalidateAlbumLists();

  return res.data;
}

// ----------------------------------------------------------------------

export async function deleteAlbum(id: string | number, userId?: string | number) {
  const url = endpoints.album.delete(id);
  const res = await axios.delete(url);

  await revalidateAlbumLists();

  return res.data;
}

// ----------------------------------------------------------------------

/**
 * Record an album view.
 * The backend increments total_views only when this customer has not viewed it before.
 */
export async function recordAlbumView(
  albumId: string | number,
): Promise<AlbumViewData | undefined> {
  try {
    const res = await axios.post<AlbumViewData>(endpoints.album.view, { albumId: Number(albumId) });

    // Revalidate album detail cache so totalViews can stay in sync.
    mutate(endpoints.album.details(albumId));

    // Revalidate viewed-id caches that feed landing viewed/unread counters.
    await mutate((key) => typeof key === 'string' && key.startsWith(endpoints.album.view));

    return res.data;
  } catch {
    // Silently ignore view-count errors — they should not block the page.
    return undefined;
  }
}