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

// ----------------------------------------------------------------------

type AlbumsData = {
  albums: IAlbumItem[];
};

export function useGetAlbums(userId?: string | number) {
  const url = userId ? `${ALBUM_ENDPOINT}?userId=${encodeURIComponent(String(userId))}` : null;

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

export async function createAlbum(album: IAlbumItem) {
  const data = { album };
  const res = await axios.post(endpoints.album.create, data);

  // Revalidate albums list
  mutate(ALBUM_ENDPOINT);
  if (album.userId) {
    mutate(`${ALBUM_ENDPOINT}?userId=${album.userId}`);
  }

  return res.data;
}

// ----------------------------------------------------------------------

export async function updateAlbum(id: string | number, album: Partial<IAlbumItem>) {
  const url = endpoints.album.update(id);
  const data = { album };
  const res = await axios.put(url, data);

  const returned = res.data as { album?: IAlbumItem };
  const userId = returned.album?.userId || album.userId;

  // Revalidate album detail and list
  mutate(endpoints.album.details(id));
  mutate(ALBUM_ENDPOINT);
  if (userId) {
    mutate(`${ALBUM_ENDPOINT}?userId=${userId}`);
  }

  return res.data;
}

// ----------------------------------------------------------------------

export async function deleteAlbum(id: string | number, userId?: string | number) {
  const url = endpoints.album.delete(id);
  const res = await axios.delete(url);

  // Revalidate album list
  mutate(ALBUM_ENDPOINT);
  if (userId) {
    mutate(`${ALBUM_ENDPOINT}?userId=${userId}`);
  }

  return res.data;
}