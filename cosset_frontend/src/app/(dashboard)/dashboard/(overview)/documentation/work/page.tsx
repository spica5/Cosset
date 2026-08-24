import { CONFIG } from 'src/config-global';

import { DocumentationView } from 'src/sections/dashboard/documentation/view';

export const metadata = { title: `Work - Documentation - ${CONFIG.appName}` };

export default function Page() {
  return <DocumentationView initialCategory="work" />;
}
