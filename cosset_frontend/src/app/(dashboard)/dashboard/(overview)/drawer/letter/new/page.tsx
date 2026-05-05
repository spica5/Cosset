import { CONFIG } from 'src/config-global';

import { LetterCreateEditView } from 'src/sections/dashboard/drawer/letter/view';

// ----------------------------------------------------------------------

export const metadata = { title: `New Letter - ${CONFIG.appName}` };

export default function Page() {
  return <LetterCreateEditView />;
}