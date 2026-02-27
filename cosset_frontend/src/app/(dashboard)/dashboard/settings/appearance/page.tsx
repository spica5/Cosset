import { CONFIG } from 'src/config-global';

import { AppearanceView } from 'src/sections/dashboard/settings/view/appearance-view';

export const metadata = { title: `Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <AppearanceView />;
}
