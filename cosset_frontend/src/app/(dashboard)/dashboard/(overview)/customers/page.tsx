import type { Metadata } from 'next';

import { CONFIG } from 'src/config-global';

import { CustomersView } from 'src/sections/dashboard/customer/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Customers | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <CustomersView />;
}
