import { CONFIG } from 'src/config-global';

import { RecoverAccountView } from 'src/sections/universe/auth/recover-account-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Recover account | ${CONFIG.appName}` };

export default function Page() {
  return <RecoverAccountView />;
}
