import axiosInstance, { endpoints } from 'src/utils/axios';

import { CONFIG } from 'src/config-global';

import { IAlbumItem } from 'src/types/album';

import { AlbumEditView } from 'src/sections/dashboard/album/view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: `Edit Album - ${CONFIG.appName}` };

async function fetchAlbum(id: string) : Promise<IAlbumItem | undefined> {
  try {
    const res = await axiosInstance.get(endpoints.album.details(id));

    const album = res.data?.album;
    if (!album) return undefined;      

    if (album.coverUrl) {
      try {
        const imageRes = await axiosInstance.get(endpoints.upload.image, {
          params: { key: album.coverUrl},
        });

        const imageData = imageRes.data as { url?: string };
        if (imageData.url) {
          album.coverUrl = imageData.url;
        }
      } catch (imageError) {
        console.error('Failed to resolve guest area image URL', imageError);
      }
    }

    return album;
  } catch (error) {
    console.error('Failed to fetch album:', error);
    return undefined;  
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params;

  const currentAlbum = await fetchAlbum(id);

  return <AlbumEditView album={currentAlbum} />;
}