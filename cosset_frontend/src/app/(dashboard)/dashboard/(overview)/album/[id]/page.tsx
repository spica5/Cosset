import axiosInstance, { endpoints } from 'src/utils/axios';

import { CONFIG } from 'src/config-global';

import { AlbumDetailsView } from 'src/sections/dashboard/album/view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: `Album details | Dashboard - ${CONFIG.appName}` };

async function fetchAlbum(id: string) {
  try {
    const res = await axiosInstance.get(endpoints.album.details(id));
    return res.data?.album;
  } catch (error) {
    console.error('Failed to fetch album:', error);
    return undefined;
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params;

  const currentAlbum = await fetchAlbum(id);

  return <AlbumDetailsView album={currentAlbum} />;
}