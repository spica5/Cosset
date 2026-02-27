import { CONFIG } from 'src/config-global';

import { ThingsToShareView } from 'src/sections/dashboard/overview/things-to-share/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <ThingsToShareView />;
}