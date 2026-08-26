import { CONFIG } from 'src/config-global';

import { VerifyEmailView } from 'src/sections/universe/auth/verify-email-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Verify email | ${CONFIG.appName}` };

export default function Page() {
  return <VerifyEmailView />;
}
