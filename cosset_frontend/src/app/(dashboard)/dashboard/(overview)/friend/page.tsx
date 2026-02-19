import { CONFIG } from 'src/config-global';

import { FriendCardsView } from 'src/sections/dashboard/friend/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Friends | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <FriendCardsView />;
}