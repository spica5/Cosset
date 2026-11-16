import { CONFIG } from 'src/global-config';

import { AdminIntroVideoView } from 'src/sections/media/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Intro video | Media - ${CONFIG.appName}` };

export default function Page() {
  return <AdminIntroVideoView />;
}
