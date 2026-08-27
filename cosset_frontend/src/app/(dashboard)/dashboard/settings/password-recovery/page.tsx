import { CONFIG } from 'src/config-global';

import { PasswordRecoveryView } from 'src/sections/dashboard/settings/view';

export const metadata = { title: `Password & Recovery - ${CONFIG.appName}` };

export default function Page() {
  return <PasswordRecoveryView />;
}
