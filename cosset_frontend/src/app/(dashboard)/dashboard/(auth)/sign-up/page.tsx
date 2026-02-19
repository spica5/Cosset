import { CONFIG } from 'src/config-global';

import { SignUpView } from 'src/auth/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Sign up | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <SignUpView />;
}
