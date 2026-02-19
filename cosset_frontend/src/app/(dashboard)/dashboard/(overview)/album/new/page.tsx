import { CONFIG } from 'src/config-global';

import { AlbumCreateView } from 'src/sections/dashboard/album/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Create Album - ${CONFIG.appName}` };

export default function Page() {
  return <AlbumCreateView />;
}