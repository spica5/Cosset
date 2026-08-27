import { CONFIG } from 'src/config-global';

import { RecoverNewEmailView } from 'src/auth/view/recover-new-email-view';

// ----------------------------------------------------------------------

export const metadata = { title: `New email | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <RecoverNewEmailView />;
}
