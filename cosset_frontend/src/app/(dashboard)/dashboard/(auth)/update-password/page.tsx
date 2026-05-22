import { CONFIG } from 'src/config-global';

import { UpdatePasswordView } from 'src/auth/view/update-password-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Update password | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <UpdatePasswordView />;
}
