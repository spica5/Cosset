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

export function useGetAlbums() {
  const { data, isLoading, error, isValidating } = useSWR<AlbumsData>(
    ALBUM_ENDPOINT,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      albums: data?.albums || [],
      albumsLoading: isLoading,
      albumsError: error,
      albumsValidating: isValidating,
      albumsEmpty: !isLoading && !data?.albums.length,
    }),
    [data?.albums, error, isLoading, isValidating]
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

  return res.data;
}

// ----------------------------------------------------------------------

export async function updateAlbum(id: string | number, album: Partial<IAlbumItem>) {
  const url = endpoints.album.update(id);
  const data = { album };
  const res = await axios.put(url, data);

  // Revalidate album detail and list
  mutate(endpoints.album.details(id));
  mutate(ALBUM_ENDPOINT);

  return res.data;
}

// ----------------------------------------------------------------------

export async function deleteAlbum(id: string | number) {
  const url = endpoints.album.delete(id);
  const res = await axios.delete(url);

  // Revalidate album list
  mutate(ALBUM_ENDPOINT);

  return res.data;
}