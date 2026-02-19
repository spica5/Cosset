import { CONFIG } from 'src/config-global';

import { OverviewDesignSpaceView } from 'src/sections/dashboard/overview/guest-area/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Design Space | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <OverviewDesignSpaceView />;
}

