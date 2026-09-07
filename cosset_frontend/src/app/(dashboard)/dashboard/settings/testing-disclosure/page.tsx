import { CONFIG } from 'src/config-global';

import { TestingDisclosureView } from 'src/sections/dashboard/settings/view';

export const metadata = { title: `Website Testing Disclosure - ${CONFIG.appName}` };

export default function Page() {
  return <TestingDisclosureView />;
}
