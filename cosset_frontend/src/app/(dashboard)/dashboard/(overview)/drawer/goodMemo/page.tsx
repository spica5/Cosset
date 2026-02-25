import { CONFIG } from 'src/config-global';

import { BlankView } from 'src/sections/dashboard/blank/view';

// ----------------------------------------------------------------------

export const metadata = { title: `goodMemo - ${CONFIG.appName}` };

export default function Page() {
  return <BlankView title="Good Memorize" />;
}
