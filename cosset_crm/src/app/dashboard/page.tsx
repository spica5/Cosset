import { CONFIG } from 'src/global-config';

import { OverviewPageVisitsView } from 'src/sections/overview/view/overview-page-visits-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <OverviewPageVisitsView />;
}
