import { CONFIG } from 'src/config-global';

import { MyJourneyNotesView } from 'src/sections/dashboard/journey-diary/view';

export const metadata = { title: `My Notes - Journey Diary - ${CONFIG.appName}` };

export default function Page() {
  return <MyJourneyNotesView />;
}
