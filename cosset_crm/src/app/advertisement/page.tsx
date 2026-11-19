import { CONFIG } from 'src/global-config';

import { AdvertisementsView } from 'src/sections/advertisement/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Advertisement - ${CONFIG.appName}` };

export default function Page() {
  return <AdvertisementsView />;
}
