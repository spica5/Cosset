import { CONFIG } from 'src/config-global';

import { RecoverVerifyView } from 'src/sections/universe/auth/recover-verify-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Verify recovery | ${CONFIG.appName}` };

export default function Page() {
  return <RecoverVerifyView />;
}
