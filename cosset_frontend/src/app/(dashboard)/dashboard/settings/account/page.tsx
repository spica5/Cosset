import { CONFIG } from 'src/config-global';

import { AccountView } from 'src/sections/dashboard/settings/view';

export const metadata = { title: `Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <AccountView />;
}
