import { CONFIG } from 'src/config-global';

import { WhereHaveYouBeenView } from 'src/sections/dashboard/journey-diary/view';

export const metadata = { title: `Where have you been - Journey Diary - ${CONFIG.appName}` };

export default function Page() {
  return <WhereHaveYouBeenView />;
}
