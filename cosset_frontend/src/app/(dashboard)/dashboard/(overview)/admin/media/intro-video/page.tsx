import { CONFIG } from 'src/config-global';

import { AdminIntroVideoView } from 'src/sections/dashboard/admin/media';

export const metadata = { title: `Intro video - Media - Admin - ${CONFIG.appName}` };

export default function Page() {
  return <AdminIntroVideoView />;
}
