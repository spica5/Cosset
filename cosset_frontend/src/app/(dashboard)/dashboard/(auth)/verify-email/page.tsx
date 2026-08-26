import { CONFIG } from 'src/config-global';

import { VerifyEmailView } from 'src/auth/view/verify-email-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Verify email | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <VerifyEmailView />;
}
