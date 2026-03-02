import { CONFIG } from 'src/config-global';

import { UniverseAlbumView } from 'src/sections/universe/universe/view/universe-album-view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: `Album | ${CONFIG.appName}` };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <UniverseAlbumView albumId={id} />;
}
