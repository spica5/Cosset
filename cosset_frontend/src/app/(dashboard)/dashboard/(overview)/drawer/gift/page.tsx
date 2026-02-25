import { CONFIG } from 'src/config-global';

import { GiftListView } from 'src/sections/dashboard/drawer/gift/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Gift - ${CONFIG.appName}` };

export default function Page() {
  return <GiftListView />;
}
