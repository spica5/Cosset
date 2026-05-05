import { CONFIG } from 'src/config-global';

import { MemoCreateEditView } from 'src/sections/dashboard/drawer/memo/view';

// ----------------------------------------------------------------------

export const metadata = { title: `New Sad Memory - ${CONFIG.appName}` };

export default function Page() {
  return <MemoCreateEditView collectionId={2} />;
}
