import { CONFIG } from 'src/config-global';

import { NeighborListView } from 'src/sections/dashboard/neighbor/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Neighbors | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <NeighborListView />;
}