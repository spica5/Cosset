import { CONFIG } from 'src/config-global';

import { AdminCinemaView } from 'src/sections/dashboard/admin/media';

export const metadata = { title: `Cinema - Media - Admin - ${CONFIG.appName}` };

export default function Page() {
  return <AdminCinemaView />;
}
