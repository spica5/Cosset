import { CONFIG } from 'src/config-global';

import { DocumentationView } from 'src/sections/dashboard/documentation/view';

export const metadata = { title: `Other - Documentation - ${CONFIG.appName}` };

export default function Page() {
  return <DocumentationView initialCategory="other" />;
}
