import { CONFIG } from 'src/config-global';

import { CollectionItemsView } from 'src/sections/dashboard/collections/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Sad Memories - ${CONFIG.appName}` };

export default function Page() {
  return <CollectionItemsView collectionId={2} />;
}
