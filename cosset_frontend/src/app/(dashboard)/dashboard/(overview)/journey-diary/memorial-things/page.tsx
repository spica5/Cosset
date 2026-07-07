import { CONFIG } from 'src/config-global';

import { MemorialThingsView } from 'src/sections/dashboard/journey-diary/view';

export const metadata = { title: `Memorial Things - Journey Diary - ${CONFIG.appName}` };

export default function Page() {
  return <MemorialThingsView />;
}
