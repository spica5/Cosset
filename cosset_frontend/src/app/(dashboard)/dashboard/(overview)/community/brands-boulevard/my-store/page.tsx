import { CONFIG } from 'src/config-global';

import { BrandsMyStoreView } from 'src/sections/dashboard/brands-boulevard/view/brands-my-store-view';

// ----------------------------------------------------------------------

export const metadata = { title: `My Store - Brands Boulevard - ${CONFIG.appName}` };

export default function Page() {
  return <BrandsMyStoreView />;
}
