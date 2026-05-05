import { CONFIG } from 'src/config-global';

import { MemoriesItemView } from 'src/sections/dashboard/drawer/memo/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Good Memories - ${CONFIG.appName}` };

export default function Page() {
  return <MemoriesItemView collectionId={1} />;
}
