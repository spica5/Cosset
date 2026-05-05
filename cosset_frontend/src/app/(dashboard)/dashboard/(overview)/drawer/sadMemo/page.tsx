import { CONFIG } from 'src/config-global';

import { MemoriesItemView } from 'src/sections/dashboard/drawer/memo/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Sad Memories - ${CONFIG.appName}` };

export default function Page() {
  return <MemoriesItemView collectionId={2} />;
}
