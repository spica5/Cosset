import { CONFIG } from 'src/config-global';

import { BrandsBoulevardListView } from 'src/sections/dashboard/brands-boulevard/view/brands-boulevard-list-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Brands Boulevard - ${CONFIG.appName}` };

export default function Page() {
  return <BrandsBoulevardListView />;
}
