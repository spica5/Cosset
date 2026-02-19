import { CONFIG } from 'src/config-global';

import { AlbumListView } from 'src/sections/dashboard/album/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Albums - ${CONFIG.appName}` };

export default function Page() {
  return <AlbumListView />;
}