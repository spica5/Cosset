import { CONFIG } from 'src/config-global';

import { ResetPasswordView } from 'src/auth/view/reset-password-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Reset password | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <ResetPasswordView />;
}
