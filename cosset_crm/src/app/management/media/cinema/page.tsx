import { CONFIG } from 'src/global-config';

import { AdminCinemaView } from 'src/sections/media/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Cinema | Media - ${CONFIG.appName}` };

export default function Page() {
  return <AdminCinemaView />;
}
