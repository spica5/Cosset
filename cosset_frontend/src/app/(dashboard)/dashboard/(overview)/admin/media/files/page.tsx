import { CONFIG } from 'src/config-global';

import { AdminFilesView } from 'src/sections/dashboard/admin/media';

export const metadata = { title: `Files - Media - Admin - ${CONFIG.appName}` };

export default function Page() {
  return <AdminFilesView />;
}
