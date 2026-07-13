import { CONFIG } from 'src/config-global';

import { CinemaHubView } from 'src/sections/dashboard/cinema/view';

export const metadata = { title: `Cinema - Community - ${CONFIG.appName}` };

export default function Page() {
  return <CinemaHubView />;
}
