import { CONFIG } from 'src/config-global';

import { SignInView } from 'src/auth/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Sign in | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <SignInView />;
}
