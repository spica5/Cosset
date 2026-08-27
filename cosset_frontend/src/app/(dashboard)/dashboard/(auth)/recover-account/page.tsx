import { CONFIG } from 'src/config-global';

import { RecoverAccountView } from 'src/auth/view/recover-account-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Recover account | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <RecoverAccountView />;
}
