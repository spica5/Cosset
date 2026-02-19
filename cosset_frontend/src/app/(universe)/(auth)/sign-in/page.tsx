import { CONFIG } from 'src/config-global';

import { SignInView } from 'src/sections/universe/auth/sign-in-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Sign in | ${CONFIG.appName}` };

export default function Page() {
  return <SignInView />;
}
