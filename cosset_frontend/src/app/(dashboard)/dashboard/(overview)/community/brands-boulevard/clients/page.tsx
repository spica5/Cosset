import { CONFIG } from 'src/config-global';

import { BrandsClientsView } from 'src/sections/dashboard/brands-boulevard/view/brands-clients-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Clients - Brands Boulevard - ${CONFIG.appName}` };

export default function Page() {
  return <BrandsClientsView />;
}
