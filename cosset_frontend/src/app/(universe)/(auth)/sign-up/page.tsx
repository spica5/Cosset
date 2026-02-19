import { CONFIG } from 'src/config-global';

import { SignUpView } from 'src/sections/universe/auth/sign-up-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Sign up | ${CONFIG.appName}` };

export default function Page() {
  return <SignUpView />;
}
