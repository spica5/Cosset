import { CONFIG } from 'src/config-global';

import { CollectionItemsView } from 'src/sections/dashboard/drawer/collections/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Good Memories - ${CONFIG.appName}` };

export default function Page() {
  return <CollectionItemsView collectionId={1} />;
}
