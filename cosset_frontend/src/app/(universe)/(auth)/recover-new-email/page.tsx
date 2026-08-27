import { CONFIG } from 'src/config-global';

import { RecoverNewEmailView } from 'src/sections/universe/auth/recover-new-email-view';

// ----------------------------------------------------------------------

export const metadata = { title: `New email | ${CONFIG.appName}` };

export default function Page() {
  return <RecoverNewEmailView />;
}
