import { CONFIG } from 'src/config-global';

import { NotFoundView } from 'src/sections/universe/error/not-found-view';

// ----------------------------------------------------------------------

export const metadata = { title: `404 page not found! | Error - ${CONFIG.appName}` };

export default function Page() {
  return <NotFoundView />;
}
