import { CONFIG } from 'src/config-global';

import { MemoCreateEditView } from 'src/sections/dashboard/drawer/memo/view';

// ----------------------------------------------------------------------

export const metadata = { title: `New Good Memory - ${CONFIG.appName}` };

export default function Page() {
  return <MemoCreateEditView collectionId={1} />;
}
