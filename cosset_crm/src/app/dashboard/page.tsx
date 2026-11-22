import { CONFIG } from 'src/global-config';

import { OverviewDashboardView } from 'src/sections/overview/view/overview-dashboard-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <OverviewDashboardView />;
}
