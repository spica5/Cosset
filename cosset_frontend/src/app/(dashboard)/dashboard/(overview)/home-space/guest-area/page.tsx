import { CONFIG } from 'src/config-global';

import { OverviewGuestAreaView } from 'src/sections/dashboard/overview/guest-area/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Welcome Guest Area | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <OverviewGuestAreaView />;
}