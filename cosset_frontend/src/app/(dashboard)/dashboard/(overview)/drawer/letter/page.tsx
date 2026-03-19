import { CONFIG } from 'src/config-global';

import { CollectionItemsView } from 'src/sections/dashboard/collections/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Letters - ${CONFIG.appName}` };

export default function Page() {
  return <CollectionItemsView collectionId={4} />;
}
