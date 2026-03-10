import { CONFIG } from 'src/config-global';

import { CollectionsManageView } from 'src/sections/dashboard/drawer/collections/view';

export const metadata = { title: `Collections - ${CONFIG.appName}` };

export default function Page() {
  return <CollectionsManageView />;
}
