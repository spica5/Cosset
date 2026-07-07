import { CONFIG } from 'src/config-global';

import { MyJourneyView } from 'src/sections/dashboard/journey-diary/view';

export const metadata = { title: `My Journey - Journey Diary - ${CONFIG.appName}` };

export default function Page() {
  return <MyJourneyView />;
}
