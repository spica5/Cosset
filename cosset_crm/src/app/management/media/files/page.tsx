import { CONFIG } from 'src/global-config';

import { AdminFilesView } from 'src/sections/media/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Files | Media - ${CONFIG.appName}` };

export default function Page() {
  return <AdminFilesView />;
}
