import { CONFIG } from 'src/global-config';

import { CustomersView } from 'src/sections/customer/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Customer - ${CONFIG.appName}` };

export default function Page() {
  return <CustomersView />;
}
