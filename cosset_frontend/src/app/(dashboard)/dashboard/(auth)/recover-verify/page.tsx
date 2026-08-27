import { CONFIG } from 'src/config-global';

import { RecoverVerifyView } from 'src/auth/view/recover-verify-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Verify recovery | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <RecoverVerifyView />;
}
